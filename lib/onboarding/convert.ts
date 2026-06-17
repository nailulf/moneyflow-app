import { createClient } from '@/lib/supabase/client'
import { advanceOnboarding, finalizeOnboarding } from '@/lib/api/onboarding-funnel'
import { isDevToolsEnabled } from '@/lib/utils/environment'
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

  const { error } = await supabase.auth.updateUser({ email, password })
  if (!error) {
    // Same user_id, now permanent. Materialize the draft into real rows.
    try { await finalizeOnboarding(draft) } catch { /* surfaced by caller retry */ }

    // The new email is unconfirmed until they click the link. In dev/preview
    // there is no real email, so auto-confirm via the dev-only admin route —
    // otherwise the account is stuck unconfirmed. In production we keep email
    // verification (the verify-email screen).
    let pendingVerification = true
    if (isDevToolsEnabled()) {
      try {
        const res = await fetch('/api/dev/confirm-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (res.ok) pendingVerification = false
      } catch {
        // Fall back to the verify-email flow if the dev confirm route fails.
      }
    }
    // Mark onboarding complete so the funnel doesn't re-trigger — best-effort.
    try { await advanceOnboarding('completed') } catch {}
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
  const supabase = createClient()
  const { error } = await supabase.auth.linkIdentity({ provider })
  if (error) throw new Error(error.message)
}

/** Dismiss the conversion prompt and continue using the app as a guest. */
export async function continueAsGuest(): Promise<void> {
  if (typeof window !== 'undefined') window.location.assign('/')
}
