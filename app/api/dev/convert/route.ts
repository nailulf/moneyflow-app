import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerComponentClient } from '@/lib/supabase'
import { isDevToolsEnabled } from '@/lib/utils/environment'

/**
 * Dev/preview-only anon→permanent conversion via the service-role admin API.
 *
 * In production, `convertWithEmail` promotes the guest with
 * `supabase.auth.updateUser({ email })`, which sends a confirmation email. The
 * built-in Supabase SMTP rate-limits email sends (`over_email_send_rate_limit`),
 * so repeated dev testing quickly breaks signup with no real inbox to confirm
 * from. This route sets email + password and confirms the address in a single
 * admin call — NO email is sent — so dev conversions always work.
 *
 * It promotes the CURRENT caller (resolved from their session cookie), so it can
 * only ever convert the guest who is actually signed in.
 */
export async function POST(request: NextRequest) {
  if (!isDevToolsEnabled()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development and preview environments' },
      { status: 403 }
    )
  }

  const { email, password } = await request.json().catch(() => ({}) as { email?: string; password?: string })
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
    // Email already belongs to another account → caller falls back to merge.
    const code = (error as { code?: string }).code
    const status = /already|exists|registered/i.test(error.message) || code === 'email_exists' ? 409 : 500
    return NextResponse.json({ error: error.message, code }, { status })
  }

  return NextResponse.json({ success: true })
}
