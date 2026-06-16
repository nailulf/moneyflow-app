const updateUser = jest.fn()
const getSession = jest.fn()
const signInWithPassword = jest.fn()
const linkIdentity = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { updateUser, getSession, signInWithPassword, linkIdentity } }),
}))
const mergeFetch = jest.fn()
global.fetch = ((...a: unknown[]) => mergeFetch(...a)) as never

import { convertWithEmail } from '@/lib/onboarding/convert'

describe('convertWithEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('links email to the same user on success (no merge)', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'ANON' } } })
    updateUser.mockResolvedValue({ data: { user: { id: 'same' } }, error: null })
    const r = await convertWithEmail('new@x.com', 'pw12345')
    expect(r.merged).toBe(false)
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('on email-exists conflict, signs into existing account and calls merge with the anon token', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'ANON_TOKEN' } } })
    updateUser.mockResolvedValue({ data: null, error: { message: 'email address already registered', code: 'email_exists' } })
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'existing' } }, error: null })
    mergeFetch.mockResolvedValue({ ok: true, json: async () => ({ merged: true }) })

    const r = await convertWithEmail('taken@x.com', 'pw12345')
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'taken@x.com', password: 'pw12345' })
    expect(mergeFetch).toHaveBeenCalledWith('/api/onboarding/merge', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ anonAccessToken: 'ANON_TOKEN' }),
    }))
    expect(r.merged).toBe(true)
  })

  it('re-throws a non-conflict updateUser error', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'ANON' } } })
    updateUser.mockResolvedValue({ data: null, error: { message: 'password too short', code: 'weak_password' } })
    await expect(convertWithEmail('a@b.com', 'x')).rejects.toThrow()
  })
})
