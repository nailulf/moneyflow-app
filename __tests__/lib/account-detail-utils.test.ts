import { buildBalanceHistory, computeBalanceChangePercent } from '@/lib/account-detail-utils'

describe('computeBalanceChangePercent', () => {
  it('returns null for < 2 points', () => {
    expect(computeBalanceChangePercent([{ date: '2026-01-01', balance: 100 }])).toBeNull()
  })
  it('returns null when the first balance is 0', () => {
    expect(computeBalanceChangePercent([
      { date: '2026-01-01', balance: 0 },
      { date: '2026-06-01', balance: 50 },
    ])).toBeNull()
  })
  it('computes a positive percent change', () => {
    expect(computeBalanceChangePercent([
      { date: '2026-01-01', balance: 28_000_000 },
      { date: '2026-06-01', balance: 45_200_000 },
    ])).toBe(61)
  })
  it('computes a negative percent change', () => {
    expect(computeBalanceChangePercent([
      { date: '2026-01-01', balance: 100 },
      { date: '2026-06-01', balance: 75 },
    ])).toBe(-25)
  })
})

describe('buildBalanceHistory', () => {
  it('walks income/expense effects from the opening anchor to current', () => {
    const series = buildBalanceHistory({
      initialBalance: 1000,
      currentBalance: 1500,
      createdAt: '2026-01-01T00:00:00Z',
      accountId: 'acc-1',
      transactions: [
        { type: 'INCOME', amount: 800, date: '2026-02-01', account_id: 'acc-1', to_account_id: null },
        { type: 'EXPENSE', amount: 300, date: '2026-03-01', account_id: 'acc-1', to_account_id: null },
      ],
    })
    expect(series[0]).toEqual({ date: '2026-01-01', balance: 1000 })
    expect(series[series.length - 1].balance).toBe(1500)
  })
})
