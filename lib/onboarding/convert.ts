import { createClient } from '@/lib/supabase/client'
import { advanceOnboarding } from '@/lib/api/onboarding-funnel'

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
 * Captures the anon access token BEFORE any call that could replace the
 * session, then attempts to promote the same anonymous user via `updateUser`
 * (keeps the same user_id, so the guest's goal/plan stay theirs).
 *
 * On an "email already registered" conflict we sign into the EXISTING account
 * and hand the captured anon token to the service-role merge endpoint, which
 * reassigns the bounded guest data into the existing account.
 *
 * @returns `{ merged: false, pendingVerification: true }` when the anon user
 *          became permanent in place — Supabase requires the user to confirm
 *          the new email before `email_confirmed_at` is set.
 *          `{ merged: true }` when data was merged into a pre-existing account.
 */
export async function convertWithEmail(
  email: string,
  password: string,
): Promise<{ merged: boolean; pendingVerification?: boolean }> {
  const supabase = createClient()

  // Capture the anon token first — updateUser/signIn can replace the session.
  const { data: { session } } = await supabase.auth.getSession()
  const anonAccessToken = session?.access_token

  const { error } = await supabase.auth.updateUser({ email, password })
  if (!error) {
    // The anon user is now permanent on the same user_id (data intact), but the
    // new email stays unconfirmed until they click the link. Mark onboarding
    // complete so the funnel doesn't re-trigger — best-effort, never block the
    // conversion if it fails.
    try {
      await advanceOnboarding('completed')
    } catch {
      // Non-fatal: the account is already converted.
    }
    return { merged: false, pendingVerification: true }
  }
  if (!EMAIL_EXISTS(error)) throw new Error(error.message)

  // Conflict: the email belongs to an existing account. Sign into it, then
  // merge the guest's data via the service-role endpoint using the anon token.
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signErr) throw new Error(signErr.message)

  const res = await fetch('/api/onboarding/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anonAccessToken }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? 'Merge failed')

  // Mark onboarding complete on the merge path too. The session is now user B's
  // (signed in above via signInWithPassword), so this correctly targets the
  // existing account — otherwise B can be left on a stale onboarding phase
  // (e.g. the legacy activation banner) after merging. Best-effort: never block
  // the conversion if it fails.
  try {
    await advanceOnboarding('completed')
  } catch {
    // Non-fatal: the data was already merged.
  }
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
