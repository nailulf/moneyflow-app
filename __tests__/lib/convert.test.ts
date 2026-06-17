const updateUser = jest.fn()
const signInWithPassword = jest.fn()
const linkIdentity = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { updateUser, signInWithPassword, linkIdentity } }),
}))
const devFetch = jest.fn()
global.fetch = ((...a: unknown[]) => devFetch(...a)) as never

const advanceOnboarding = jest.fn().mockResolvedValue(undefined)
const finalizeOnboarding = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/api/onboarding-funnel', () => ({
  advanceOnboarding: (...a: unknown[]) => advanceOnboarding(...a),
  finalizeOnboarding: (...a: unknown[]) => finalizeOnboarding(...a),
}))

import { convertWithEmail } from '@/lib/onboarding/convert'

const DRAFT = { allocations: [], period: 'monthly' as const }

describe('convertWithEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('links email to the same user on success (no merge)', async () => {
    updateUser.mockResolvedValue({ data: { user: { id: 'same' } }, error: null })
    const r = await convertWithEmail('new@x.com', 'pw12345', DRAFT)
    expect(r.merged).toBe(false)
    expect(r.pendingVerification).toBe(true)
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(finalizeOnboarding).toHaveBeenCalledTimes(1)
    expect(finalizeOnboarding).toHaveBeenCalledWith(DRAFT)
  })

  it('on email-exists conflict, signs into existing account, calls finalizeOnboarding, and advances to completed', async () => {
    updateUser.mockResolvedValue({ data: null, error: { message: 'email address already registered', code: 'email_exists' } })
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'existing' } }, error: null })

    const r = await convertWithEmail('taken@x.com', 'pw12345', DRAFT)
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'taken@x.com', password: 'pw12345' })
    expect(finalizeOnboarding).toHaveBeenCalledTimes(1)
    expect(finalizeOnboarding).toHaveBeenCalledWith(DRAFT)
    expect(advanceOnboarding).toHaveBeenCalledWith('completed')
    expect(r.merged).toBe(true)
  })

  it('re-throws a non-conflict updateUser error', async () => {
    updateUser.mockResolvedValue({ data: null, error: { message: 'password too short', code: 'weak_password' } })
    await expect(convertWithEmail('a@b.com', 'x', DRAFT)).rejects.toThrow()
  })
})
