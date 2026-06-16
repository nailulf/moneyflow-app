import { createClient } from '@/lib/supabase/client'

let inFlight: Promise<string> | null = null

interface EnsureAnonymousSession {
  (captchaToken?: string): Promise<string>
  /** Test helper: clear the single-flight latch between tests. */
  reset: () => void
}

/**
 * Ensures the browser has a Supabase session, creating an anonymous one if needed.
 * Single-flight: concurrent callers (multiple tabs/components) share one sign-in.
 * Returns the user id. Pass a Turnstile token when creating a new anonymous user.
 */
export const ensureAnonymousSession: EnsureAnonymousSession = async (captchaToken?: string): Promise<string> => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return user.id

  if (!inFlight) {
    inFlight = (async () => {
      const { data, error } = await supabase.auth.signInAnonymously(
        captchaToken ? { options: { captchaToken } } : undefined
      )
      if (error || !data.user) throw error ?? new Error('Anonymous sign-in failed')
      return data.user.id
    })().finally(() => { inFlight = null })
  }
  return inFlight
}

ensureAnonymousSession.reset = () => { inFlight = null }
