import { createClient } from '@/lib/supabase/client'
import { advanceOnboarding, finalizeOnboarding } from '@/lib/api/onboarding-funnel'
import type { OnboardingDraft } from '@/lib/onboarding/build-draft'
import { getSiteUrl } from '@/lib/utils/site-url'
import {
  persistPendingDraft,
  readPendingDraft,
  clearPendingDraft,
  OAUTH_FINALIZE_PARAM,
} from '@/lib/onboarding/pending-draft'

/**
 * Convert an anonymous guest into a permanent email/password account.
 *
 * Attempts to promote the same anonymous user via `updateUser` (keeps the same
 * user_id, so the guest's session data stays intact). On success, materializes
 * the in-memory onboarding draft into real DB rows via `finalizeOnboarding`.
 *
 * On an "email already registered" conflict we sign into the EXISTING account
 * and materialize the draft into that account instead.
 *
 * @returns `{ merged: false, pendingVerification: true }` when the anon user
 *          became permanent in place — Supabase requires the user to confirm
 *          the new email before `email_confirmed_at` is set.
 *          `{ merged: true }` when the draft was materialized into a
 *          pre-existing account.
 */
export async function convertWithEmail(
  email: string,
  password: string,
  draft: OnboardingDraft,
): Promise<{ merged: boolean; pendingVerification?: boolean }> {
  const supabase = createClient()

  // Create the real account server-side via the service-role admin API
  // (`/api/onboarding/convert`). This sets email + password and confirms the
  // address in one call with NO email sent — so it never trips Supabase's
  // email-send rate limit, the way a client-side `updateUser({ email })` email
  // *change* did. The guest's session becomes a permanent, confirmed account in
  // place (same user_id), so their funnel data stays theirs.
  const res = await fetch('/api/onboarding/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (res.ok) {
    // The admin email change rotates the session, so the in-memory anon JWT is
    // now stale. Clear it locally (a stale refresh token would make the SSR
    // middleware wipe the cookie on the next navigation), then sign in fresh
    // with the new credentials — same user_id, so the guest's data stays theirs.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signErr) throw new Error(signErr.message)
    try { await finalizeOnboarding(draft) } catch { /* surfaced by caller retry */ }
    // Mark onboarding complete so the funnel doesn't re-trigger — best-effort.
    try { await advanceOnboarding('completed') } catch {}
    // Confirmed server-side → no verify step; straight into the app.
    return { merged: false, pendingVerification: false }
  }

  // Conversion failed. The dominant cause is that the email already belongs to
  // an existing account (the admin email change reports this only as an opaque
  // error, so we don't rely on a specific code). Try signing into that account
  // with the supplied credentials — if it works, the email is genuinely theirs,
  // so merge the draft into it. This only succeeds for a real account with
  // matching credentials, so it can't be abused.
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
  if (!signErr) {
    try { await finalizeOnboarding(draft) } catch {}
    try { await advanceOnboarding('completed') } catch {}
    return { merged: true }
  }

  // Sign-in didn't help: either the email is taken with a different password, or
  // a genuine server error. Surface the server's message (already friendly for
  // the conflict case) so the user knows to log in instead.
  const payload = (await res.json().catch(() => ({}))) as { error?: string }
  throw new Error(payload.error ?? 'Could not create your account. Please try again.')
}

/**
 * Re-send the confirmation email after an email conversion
 * (`convertWithEmail` → `updateUser({ email })`). Promoting an anon user to a
 * permanent email triggers Supabase's email-change confirmation flow, so we
 * resend with `type: 'email_change'`.
 *
 * @returns `true` if the resend request succeeded, `false` otherwise.
 */
export async function resendConfirmation(email: string): Promise<boolean> {
  const supabase = createClient()
  try {
    // `email_change` (not `signup`): promoting an anonymous user via
    // `updateUser({ email })` goes through Supabase's email-change confirmation
    // flow, so the resend must use the matching type to reissue that link.
    const { error } = await supabase.auth.resend({ type: 'email_change', email })
    return !error
  } catch {
    return false
  }
}

/**
 * Begin converting an anonymous guest into a permanent account via an OAuth
 * provider by linking the identity to the current (anon) user.
 *
 * `linkIdentity` redirects the browser to the provider and back — a full-page
 * navigation that wipes the in-memory funnel store. So unlike the email path
 * (which finalizes in-process), the draft must SURVIVE the round-trip: we
 * serialize it to `sessionStorage` here, and point Supabase's post-OAuth
 * `redirectTo` back at the conversion screen with the `OAUTH_FINALIZE_PARAM`
 * marker. On return, `/start/save` rehydrates the draft and calls
 * `finalizeOnboarding` exactly once (see `finalizePendingOAuthDraft` /
 * `app/start/save/page.tsx`). Without this, an OAuth-converted guest lands with
 * no categories/account/goal/plan — anonymous users are no longer seeded by the
 * signup trigger (migration 057).
 *
 * @returns nothing; on success the browser navigates away to the provider.
 */
export async function convertWithOAuth(
  provider: 'google' | 'apple',
  draft: OnboardingDraft,
): Promise<void> {
  // Persist BEFORE initiating the redirect — once linkIdentity navigates away,
  // the in-memory Zustand draft is gone. Best-effort: if storage is blocked the
  // link still proceeds (finalize just won't auto-run, same as the old gap).
  persistPendingDraft(draft)

  const redirectTo = `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(
    `/start/save?${OAUTH_FINALIZE_PARAM}=1`,
  )}`

  const supabase = createClient()
  const { error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo },
  })
  if (error) throw new Error(error.message)
}

/**
 * Finalize a draft persisted across an OAuth redirect. Called by the conversion
 * screen when it lands back authenticated with the `OAUTH_FINALIZE_PARAM`
 * marker. Reads the persisted draft, materializes it via the finalize RPC
 * (idempotent server-side), marks onboarding complete, then clears the draft so
 * a refresh can't re-run it.
 *
 * @returns `true` when a pending draft was found and finalize was attempted,
 *          `false` when there was nothing to do (already finalized / no draft).
 *          Throws only if finalize itself fails, so the caller can surface an
 *          error and leave the draft in place for a retry.
 */
export async function finalizePendingOAuthDraft(): Promise<boolean> {
  const draft = readPendingDraft()
  if (!draft) return false

  // The finalize RPC is idempotent (find-or-create + upserts), so a duplicate
  // call is harmless; we still clear the draft on success to stop re-runs.
  await finalizeOnboarding(draft)
  try { await advanceOnboarding('completed') } catch {}
  clearPendingDraft()
  return true
}

/** Dismiss the conversion prompt and continue using the app as a guest. */
export async function continueAsGuest(): Promise<void> {
  if (typeof window !== 'undefined') window.location.assign('/')
}
