/** @jest-environment node */
// __tests__/api/onboarding-finalize.test.ts
import { POST } from '@/app/api/onboarding/finalize/route'

// Minimal smoke test: unauthenticated requests are rejected. (Full DB behavior
// is covered by the integration test in Task 8 against a deployed RPC.)
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}))

describe('POST /api/onboarding/finalize', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const res = await POST(new Request('http://t/api/onboarding/finalize', {
      method: 'POST', body: JSON.stringify({ allocations: [] }),
    }))
    expect(res.status).toBe(401)
  })
})
