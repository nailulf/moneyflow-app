const getUser = jest.fn()
const signInAnonymously = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: (...a: unknown[]) => getUser(...a), signInAnonymously: (...a: unknown[]) => signInAnonymously(...a) } }),
}))

import { ensureAnonymousSession } from '@/lib/supabase/anonymous'

describe('ensureAnonymousSession', () => {
  beforeEach(() => { jest.clearAllMocks(); ensureAnonymousSession.reset?.() })

  it('does not sign in when a session already exists', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'existing' } } })
    const id = await ensureAnonymousSession()
    expect(id).toBe('existing')
    expect(signInAnonymously).not.toHaveBeenCalled()
  })

  it('signs in anonymously once for concurrent callers (single-flight)', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    signInAnonymously.mockResolvedValue({ data: { user: { id: 'anon-1' } }, error: null })
    const [a, b] = await Promise.all([ensureAnonymousSession(), ensureAnonymousSession()])
    expect(a).toBe('anon-1')
    expect(b).toBe('anon-1')
    expect(signInAnonymously).toHaveBeenCalledTimes(1)
  })
})
