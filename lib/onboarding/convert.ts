import { createClient } from '@/lib/supabase/client'

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
 * @returns `{ merged: false }` when the anon user became permanent in place,
 *          `{ merged: true }` when data was merged into a pre-existing account.
 */
export async function convertWithEmail(email: string, password: string): Promise<{ merged: boolean }> {
  const supabase = createClient()

  // Capture the anon token first — updateUser/signIn can replace the session.
  const { data: { session } } = await supabase.auth.getSession()
  const anonAccessToken = session?.access_token

  const { error } = await supabase.auth.updateUser({ email, password })
  if (!error) return { merged: false }
  if (!EMAIL_EXISTS(error)) throw new Error(error.message)

  // Conflict: the email belongs to an existing account. Sign into it, then
  // merge the guest's data via the service-role endpoint using the anon token.
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signErr) throw new Error(signErr.message)

  const res = await fetch('/api/onboarding/merge', {
    method: 'POST',
    body: JSON.stringify({ anonAccessToken }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? 'Merge failed')
  return { merged: true }
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
