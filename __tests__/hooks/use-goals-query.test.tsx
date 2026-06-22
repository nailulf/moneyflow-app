import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAccountGoals } from '@/hooks/useGoalsQuery'

// The hooks read each account's live balance from useAccounts() (AccountContext).
// Mock it so the test exercises the real contract: waterfall `saved` applied per goal.
jest.mock('@/contexts/AccountContext', () => ({
  useAccounts: () => ({
    accounts: [
      { id: 'a1', balance: 15370000, currentBalance: 15370000, currency: 'IDR', type: 'BANK' },
    ],
  }),
}))

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: any) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  // /api/accounts/<id>/goal now returns an array of goals
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/goal')) return Promise.resolve({ ok: true, json: () => Promise.resolve([
      { id: 'early', account_id: 'a1', name: 'Dana Darurat', goal_type: 'emergency_fund', target_amount: 30000000, target_date: '2026-12-31', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ]) }) as any
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) }) as any
  }) as any
})

it('applies the waterfall saved to an account\'s goals', async () => {
  const { result } = renderHook(() => useAccountGoals('a1'), { wrapper: wrap() })
  await waitFor(() => expect(result.current.data?.length).toBe(1))
  expect(result.current.data![0].saved).toBe(15370000)
  expect(result.current.data![0].isCompleted).toBe(false)
})
