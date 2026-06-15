/**
 * @jest-environment node
 */
const getUser = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }))
const adminFrom = jest.fn()
jest.mock('@/lib/supabase', () => ({ createServerComponentClient: () => ({ from: adminFrom }) }))

import { POST } from '@/app/api/onboarding/plan/route'
const req = (b: unknown) =>
  new Request('http://x/api/onboarding/plan', { method: 'POST', body: JSON.stringify(b) }) as never

describe('POST /api/onboarding/plan', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401s when unauthenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await POST(req({ monthly_income: 1, period: 'monthly', allocations: [] }))).status).toBe(401)
  })

  it('422s when monthly_income is negative', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    expect((await POST(req({ monthly_income: -1, period: 'monthly', allocations: [] }))).status).toBe(422)
  })

  it('creates a plan and its categories, returns 200', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const planUpsert = {
      upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'plan1' }, error: null }) }) }),
    }
    const catInsert = {
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      insert: () => Promise.resolve({ error: null }),
    }
    adminFrom.mockImplementation((t: string) => (t === 'budget_plans' ? planUpsert : catInsert))
    const res = await POST(
      req({
        monthly_income: 8500000,
        period: 'monthly',
        allocations: [{ category_id: '11111111-1111-1111-1111-111111111111', amount: 2000000 }],
      })
    )
    expect(res.status).toBe(200)
    expect((await res.json()).plan.id).toBe('plan1')
  })
})
