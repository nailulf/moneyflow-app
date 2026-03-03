import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase PKCE callback handler.
 *
 * Supabase email verification (and OAuth) redirects here with a `code`
 * query parameter. We exchange that code for a session, then:
 *  1. Write user preferences from registration metadata into user_settings
 *     (currency, country, goal) — this is the production equivalent of what
 *     the dev-mode flow does immediately after auto-login.
 *  2. Redirect to `next` (a relative path supplied by the original flow) or
 *     the dashboard root.
 *
 * The `next` param is sanitised to a relative path only to prevent open
 * redirect attacks.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Only allow relative paths for the post-auth redirect target.
  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') ? rawNext : '/'

  if (!code) {
    // No code — something went wrong before we were reached.
    return NextResponse.redirect(new URL('/login?error=missing_code', origin))
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] code exchange failed:', error?.message)
    return NextResponse.redirect(new URL('/login?error=verification_failed', origin))
  }

  // Write user preferences that were captured at registration time.
  // In production, signUp stores these in user_metadata but cannot write to
  // user_settings (no active session yet). Now that we have a session we can
  // persist them to the wide table.
  const meta = data.user.user_metadata ?? {}
  const updates: Record<string, unknown> = {}

  if (meta.preferred_currency) updates.default_currency = meta.preferred_currency
  if (meta.country) updates.country = meta.country
  if (meta.user_goal) updates.user_goal = meta.user_goal

  if (Object.keys(updates).length > 0) {
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert(
        { user_id: data.user.id, ...updates, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )

    if (upsertError) {
      // Non-fatal: user can still log in; preferences will fall back to defaults.
      console.error('[auth/callback] failed to write user settings:', upsertError.message)
    }
  }

  // Signal to the client that this is a fresh registration so it can fire
  // the registration_completed analytics event on first render.
  const destination = new URL(next, origin)
  destination.searchParams.set('registered', '1')
  return NextResponse.redirect(destination)
}
