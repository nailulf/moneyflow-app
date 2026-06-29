import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerComponentClient } from '@/lib/supabase'
import { enforceRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * Anonymous-guest → permanent account conversion via the service-role admin API.
 *
 * The /start funnel signs each visitor in anonymously so their in-memory plan
 * draft has a live session to attach to. This route turns that guest session
 * into a REAL, confirmed email/password account in a single admin call:
 * `admin.updateUserById({ email, password, email_confirm: true })`. Crucially it
 * sends NO email, so it never hits Supabase's email-send rate limit
 * (`over_email_send_rate_limit`) — the bug that the previous client-side
 * `updateUser({ email })` (an email *change*) flow suffered from.
 *
 * It promotes the CURRENT caller (resolved from their session cookie), so a
 * caller can only ever convert the guest who is actually signed in — the
 * request body's email/password are the new credentials, never a target user id.
 *
 * Email is confirmed server-side (no verification round-trip) so the draft —
 * which lives only in the client funnel store — can be finalized immediately
 * while the session is live. The funnel is verification-optional by design.
 */
export async function POST(request: NextRequest) {
  // Abuse guard: this route sets credentials / promotes accounts. Limit per IP
  // (the caller may not yet have a stable user id worth keying on).
  const limited = await enforceRateLimit(`auth:convert:${getClientIp(request)}`, RATE_LIMITS.authSensitive)
  if (limited) return limited

  const { email, password } = await request
    .json()
    .catch(() => ({}) as { email?: string; password?: string })

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // Resolve the current (anonymous) caller from their session.
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Promote via service role: set email + password and confirm in one call.
  const admin = createServerComponentClient()
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    // Promoting to an email that already belongs to another account fails here.
    // Supabase doesn't surface a clean `email_exists` for the admin email change
    // — it returns an opaque `unexpected_failure` ("Error updating user") — so we
    // treat that (and any explicit conflict signal) as a 409. The caller then
    // attempts to sign into the existing account and merge the draft into it.
    const code = (error as { code?: string }).code
    const looksLikeConflict =
      code === 'email_exists' ||
      code === 'unexpected_failure' ||
      /already|exists|registered/i.test(error.message)
    return NextResponse.json(
      { error: looksLikeConflict ? 'An account with this email already exists.' : error.message, code },
      { status: looksLikeConflict ? 409 : 500 },
    )
  }

  return NextResponse.json({ success: true })
}
