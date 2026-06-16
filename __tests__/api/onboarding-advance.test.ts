/**
 * @jest-environment node
 */
const getUser = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }))
const adminFrom = jest.fn()
jest.mock('@/lib/supabase', () => ({ createServerComponentClient: () => ({ from: adminFrom }) }))

import { POST } from '@/app/api/onboarding/advance/route'
function req(body: unknown) {
  return new Request('http://x/api/onboarding/advance', { method: 'POST', body: JSON.stringify(body) }) as never
}

// Builds a mock of the user_onboarding update chain:
//   from('user_onboarding').update(payload).eq('user_id', id).select().single()
// `update` is the jest.fn we assert the payload on.
function onboardingUpdateMock(update: jest.Mock, row: unknown) {
  update.mockReturnValue({
    eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }),
  })
  return { update }
}

describe('POST /api/onboarding/advance', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401s when unauthenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(req({ phase: 'goal_setup' }))
    expect(res.status).toBe(401)
  })

  it('422s on invalid phase', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const res = await POST(req({ phase: 'not_a_phase' }))
    expect(res.status).toBe(422)
  })

  it('advances current_phase to goal_setup and returns 200', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const update = jest.fn()
    onboardingUpdateMock(update, { id: 'ob1', current_phase: 'goal_setup' })
    adminFrom.mockImplementation((t: string) =>
      t === 'user_onboarding' ? { update } : {}
    )

    const res = await POST(req({ phase: 'goal_setup' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.onboarding.current_phase).toBe('goal_setup')
    expect(update).toHaveBeenCalledWith({ current_phase: 'goal_setup' })
  })

  it('sets is_completed true when advancing to completed', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const update = jest.fn()
    onboardingUpdateMock(update, { id: 'ob1', current_phase: 'completed', is_completed: true })
    adminFrom.mockImplementation((t: string) =>
      t === 'user_onboarding' ? { update } : {}
    )

    const res = await POST(req({ phase: 'completed' }))
    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_completed: true }))
  })

  it('logs an onboarding_event when event is provided', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const update = jest.fn()
    onboardingUpdateMock(update, { id: 'ob1', current_phase: 'goal_setup' })
    const insert = jest.fn().mockResolvedValue({ error: null })
    adminFrom.mockImplementation((t: string) =>
      t === 'user_onboarding' ? { update } : { insert }
    )

    const res = await POST(
      req({ phase: 'goal_setup', event: { event_type: 'phase_started', metadata: { src: 'funnel' } } })
    )
    expect(res.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        event_type: 'phase_started',
        phase: 'goal_setup',
        metadata: { src: 'funnel' },
      })
    )
  })
})
