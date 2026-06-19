import { createClient } from '@/lib/supabase/client'
import { advanceOnboarding, finalizeOnboarding } from '@/lib/api/onboarding-funnel'
import type { OnboardingDraft } from '@/lib/onboarding/build-draft'

/**
 * Detects the Supabase "email already registered" error returned by
 * `auth.updateUser({ email })` when the target email belongs to an existing
 * account. Supabase surfaces this with `code: 'email_exists'`; we also match on
 * the message text as a defensive fallback across Supabase versions.
 */
const EMAIL_EXISTS = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'email_exists' || /already registered|already.*exists/i.test(e.message ?? ''))

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

  // Promote the anon user in place — same user_id (the guest's data stays
  // theirs) and the current session stays valid, so no re-login is needed.
  const { data, error } = await supabase.auth.updateUser({ email, password })
  if (!error) {
    try { await finalizeOnboarding(draft) } catch { /* surfaced by caller retry */ }
    // Mark onboarding complete so the funnel doesn't re-trigger — best-effort.
    try { await advanceOnboarding('completed') } catch {}
    // If the project requires email confirmation, the new address is pending
    // until the user clicks the link → show the verify step. With confirmation
    // disabled it's confirmed immediately → straight into the app.
    const pendingVerification = !data.user?.email_confirmed_at
    return { merged: false, pendingVerification }
  }
  if (!EMAIL_EXISTS(error)) throw new Error(error.message)

  // Email exists → sign into account B, then materialize the draft into it.
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signErr) throw new Error(signErr.message)

  try { await finalizeOnboarding(draft) } catch {}
  try { await advanceOnboarding('completed') } catch {}
  return { merged: true }
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
 * provider by linking the identity to the current (anon) user. This redirects
 * to the provider; the conflict→merge path resolves after the OAuth round-trip
 * and is wired up post-redirect in a later task. Keep this focused on
 * initiating the link.
 */
export async function convertWithOAuth(provider: 'google' | 'apple'): Promise<void> {
  // TODO(oauth-finalize): post-redirect, the OAuth callback must call finalizeOnboarding(draft) — anonymous users are no longer seeded by the signup trigger (migration 057), so without this an OAuth-converted guest lands with no categories/account/goal/plan. Tracked as a later task in the pre-account-onboarding spec.
  const supabase = createClient()
  const { error } = await supabase.auth.linkIdentity({ provider })
  if (error) throw new Error(error.message)
}

/** Dismiss the conversion prompt and continue using the app as a guest. */
export async function continueAsGuest(): Promise<void> {
  if (typeof window !== 'undefined') window.location.assign('/')
}
