const signInWithPassword = jest.fn()
const signOut = jest.fn().mockResolvedValue(undefined)
const linkIdentity = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword, signOut, linkIdentity } }),
}))
const fetchMock = jest.fn()
global.fetch = ((...a: unknown[]) => fetchMock(...a)) as never

const advanceOnboarding = jest.fn().mockResolvedValue(undefined)
const finalizeOnboarding = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/api/onboarding-funnel', () => ({
  advanceOnboarding: (...a: unknown[]) => advanceOnboarding(...a),
  finalizeOnboarding: (...a: unknown[]) => finalizeOnboarding(...a),
}))

import { convertWithEmail } from '@/lib/onboarding/convert'

const DRAFT = { allocations: [], period: 'monthly' as const }

/** Minimal Response-like stub for the /api/onboarding/convert fetch. */
const apiResponse = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

describe('convertWithEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a real confirmed account server-side, signs in fresh, and finalizes (no merge, no verify)', async () => {
    fetchMock.mockResolvedValue(apiResponse(200, { success: true }))
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'same' } }, error: null })

    const r = await convertWithEmail('new@x.com', 'pw12345', DRAFT)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/onboarding/convert',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'new@x.com', password: 'pw12345' })
    expect(finalizeOnboarding).toHaveBeenCalledTimes(1)
    expect(finalizeOnboarding).toHaveBeenCalledWith(DRAFT)
    expect(advanceOnboarding).toHaveBeenCalledWith('completed')
    expect(r.merged).toBe(false)
    expect(r.pendingVerification).toBe(false)
  })

  it('on conflict (email taken), signs into the existing account and merges the draft', async () => {
    fetchMock.mockResolvedValue(apiResponse(409, { error: 'An account with this email already exists.' }))
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'existing' } }, error: null })

    const r = await convertWithEmail('taken@x.com', 'pw12345', DRAFT)

    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'taken@x.com', password: 'pw12345' })
    expect(finalizeOnboarding).toHaveBeenCalledTimes(1)
    expect(finalizeOnboarding).toHaveBeenCalledWith(DRAFT)
    expect(advanceOnboarding).toHaveBeenCalledWith('completed')
    expect(r.merged).toBe(true)
  })

  it('throws the server message when conversion fails and the merge sign-in also fails', async () => {
    fetchMock.mockResolvedValue(apiResponse(409, { error: 'An account with this email already exists.' }))
    // Email is taken but the supplied password doesn't match → sign-in fails.
    signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } })

    await expect(convertWithEmail('taken@x.com', 'wrongpw', DRAFT)).rejects.toThrow(
      'An account with this email already exists.',
    )
    expect(finalizeOnboarding).not.toHaveBeenCalled()
  })
})
