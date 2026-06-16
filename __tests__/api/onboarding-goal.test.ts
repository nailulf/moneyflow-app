/**
 * @jest-environment node
 */
const getUser = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }))
const adminFrom = jest.fn()
jest.mock('@/lib/supabase', () => ({ createServerComponentClient: () => ({ from: adminFrom }) }))

import { POST } from '@/app/api/onboarding/goal/route'
function req(body: unknown) {
  return new Request('http://x/api/onboarding/goal', { method: 'POST', body: JSON.stringify(body) }) as never
}

describe('POST /api/onboarding/goal', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401s when unauthenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(req({ goal_type: 'emergency_fund', target_amount: 1000 }))
    expect(res.status).toBe(401)
  })

  it('422s on invalid body', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const res = await POST(req({ goal_type: 'emergency_fund', target_amount: -5 }))
    expect(res.status).toBe(422)
  })

  it('writes the goal onto the default account and returns 200', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const accountsSelect = { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'acc1' }, error: null }) }) }) }) }
    const goalUpsert = { upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'goal1', account_id: 'acc1' }, error: null }) }) }) }
    adminFrom.mockImplementation((t: string) => (t === 'accounts' ? accountsSelect : goalUpsert))

    const res = await POST(req({ goal_type: 'emergency_fund', target_amount: 10000000, target_date: '2026-12-31' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.goal.id).toBe('goal1')
  })

  it('accepts the new debt_payoff goal type and returns 200', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const accountsSelect = { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'acc1' }, error: null }) }) }) }) }
    const goalUpsert = { upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'goal2', account_id: 'acc1' }, error: null }) }) }) }
    adminFrom.mockImplementation((t: string) => (t === 'accounts' ? accountsSelect : goalUpsert))

    const res = await POST(req({ goal_type: 'debt_payoff', target_amount: 5000000, target_date: '2026-12-31' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.goal.id).toBe('goal2')
  })
})
