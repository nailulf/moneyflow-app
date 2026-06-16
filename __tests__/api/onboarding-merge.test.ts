/**
 * @jest-environment node
 */
const getUser = jest.fn() // cookie session => target user B
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }))

const adminGetUser = jest.fn() // admin.auth.getUser(token) => anonymous user A
const deleteUser = jest.fn().mockResolvedValue({ error: null })
const adminFrom = jest.fn()
jest.mock('@/lib/supabase', () => ({
  createServerComponentClient: () => ({
    auth: { getUser: adminGetUser, admin: { deleteUser } },
    from: adminFrom,
  }),
}))

import { POST } from '@/app/api/onboarding/merge/route'

const req = (b: unknown) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(b) }) as never

describe('POST /api/onboarding/merge', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401s without a target session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await POST(req({ anonAccessToken: 'tok-abcabcabc' }))).status).toBe(401)
  })

  it('400s on invalid body', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'B' } }, error: null })
    expect((await POST(req({}))).status).toBe(400)
  })

  it('403s when the token does not belong to an anonymous user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'B' } }, error: null })
    adminGetUser.mockResolvedValue({ data: { user: { id: 'X', is_anonymous: false } }, error: null })
    expect((await POST(req({ anonAccessToken: 'tok-abcabcabc' }))).status).toBe(403)
  })

  it('403s when the anon token resolves to the same user as the session', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'B' } }, error: null })
    adminGetUser.mockResolvedValue({ data: { user: { id: 'B', is_anonymous: true } }, error: null })
    expect((await POST(req({ anonAccessToken: 'tok-abcabcabc' }))).status).toBe(403)
  })

  it('400s when the anon token is invalid', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'B' } }, error: null })
    adminGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } })
    expect((await POST(req({ anonAccessToken: 'tok-abcabcabc' }))).status).toBe(400)
  })

  it('imports goal + plan and deletes the anonymous user on the happy path', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'B' } }, error: null })
    adminGetUser.mockResolvedValue({ data: { user: { id: 'A', is_anonymous: true } }, error: null })

    const goalInsert = jest.fn().mockResolvedValue({ error: null })
    const planCatInsert = jest.fn().mockResolvedValue({ error: null })
    const planInsert = jest.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'newplan' }, error: null }) }),
    })

    // Chainable query stubs keyed by table + (for financial_goals) whether a
    // join column is selected (B's existing goals select 'account_id, accounts!inner').
    adminFrom.mockImplementation((table: string) => {
      if (table === 'financial_goals') {
        return {
          select: (cols: string) => {
            // A's goal: select('*, accounts!inner(user_id)') -> maybeSingle
            if (cols.includes('*')) {
              return {
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: {
                        name: 'Emergency Fund',
                        goal_type: 'emergency_fund',
                        target_amount: 1000,
                        target_date: '2026-12-31',
                      },
                      error: null,
                    }),
                }),
              }
            }
            // B's existing goal account ids: select('account_id, accounts!inner(user_id)') -> list
            return { eq: () => Promise.resolve({ data: [], error: null }) }
          },
          insert: goalInsert,
        }
      }
      if (table === 'budget_plans') {
        return {
          select: (cols: string) => ({
            eq: () =>
              cols === 'period'
                ? // B's existing plan periods -> list
                  Promise.resolve({ data: [], error: null })
                : // A's plan -> maybeSingle
                  ({
                    maybeSingle: () =>
                      Promise.resolve({ data: { id: 'gplan', period: 'monthly' }, error: null }),
                  }),
          }),
          insert: planInsert,
        }
      }
      if (table === 'budget_plan_categories') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  {
                    allocated_amount: 500,
                    categories: { name: 'Food & Dining', group_type: 'EXPENSE' },
                  },
                ],
                error: null,
              }),
          }),
          insert: planCatInsert,
        }
      }
      if (table === 'categories') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ id: 'b1', name: 'Food & Dining', group_type: 'EXPENSE' }],
                error: null,
              }),
          }),
        }
      }
      if (table === 'accounts') {
        // B's default account
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 'accB' }, error: null }),
              }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    const res = await POST(req({ anonAccessToken: 'tok-abcabcabc' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.merged).toBe(true)

    // goal imported onto B's default account
    expect(goalInsert).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'accB', goal_type: 'emergency_fund' })
    )
    // plan imported with total_amount = sum of allocations, period mapped from real column
    expect(planInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'B', period: 'monthly', total_amount: 500 })
    )
    // allocations remapped to B's category id under plan_id
    expect(planCatInsert).toHaveBeenCalledWith([
      { plan_id: 'newplan', category_id: 'b1', allocated_amount: 500 },
    ])
    // anonymous user reaped after the import
    expect(deleteUser).toHaveBeenCalledWith('A')
  })
})
