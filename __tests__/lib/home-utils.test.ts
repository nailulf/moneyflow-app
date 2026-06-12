import {
  getGreetingKey,
  summarizeToday,
  topExpenses,
  monthlySpending,
  monthlyNetWorthPoints,
  splitAccounts,
  projectNextOccurrence,
  upcomingRecurring,
} from '@/lib/home-utils'
import type { Transaction } from '@/types/database'

const txn = (over: Partial<Transaction>): Transaction =>
  ({
    id: 'x', user_id: 'u', date: '2026-06-12', description: 'd', amount: -100,
    type: 'EXPENSE', category_id: 'c1', account_id: 'a1', to_account_id: null,
    currency: 'IDR', merchant: null, notes: null, tags: null,
    is_recurring: false, recurring_frequency: null, recurring_end_date: null,
    last_processed_date: null, statement_id: null, raw_data: null,
    posting_date: null, is_duplicate: false, duplicate_of: null,
    created_at: '', updated_at: '',
    ...over,
  }) as Transaction

describe('getGreetingKey', () => {
  it.each([
    [5, 'morning'], [11, 'morning'],
    [12, 'afternoon'], [17, 'afternoon'],
    [18, 'evening'], [23, 'evening'], [0, 'evening'], [4, 'evening'],
  ])('hour %i → %s', (hour, key) => {
    expect(getGreetingKey(hour)).toBe(key)
  })
})

describe('summarizeToday', () => {
  const today = '2026-06-12'
  it('sums absolute EXPENSE amounts and counts all of today\'s transactions', () => {
    const list = [
      txn({ date: today, amount: -32000 }),
      txn({ date: today, amount: -25000 }),
      txn({ date: today, type: 'INCOME', amount: 500000 }),
      txn({ date: '2026-06-11', amount: -99000 }),
    ]
    expect(summarizeToday(list, today)).toEqual({ spent: 57000, count: 3 })
  })
  it('returns zeros for no transactions today', () => {
    expect(summarizeToday([txn({ date: '2026-06-01' })], today)).toEqual({ spent: 0, count: 0 })
  })
})

describe('topExpenses', () => {
  it('returns current-month expenses sorted by absolute amount, capped at n', () => {
    const list = [
      txn({ id: '1', date: '2026-06-03', amount: -800000 }),
      txn({ id: '2', date: '2026-06-05', amount: -2450000 }),
      txn({ id: '3', date: '2026-06-07', amount: -1200000 }),
      txn({ id: '4', date: '2026-06-09', amount: -100 }),
      txn({ id: '5', date: '2026-05-30', amount: -9999999 }), // other month
      txn({ id: '6', date: '2026-06-10', type: 'INCOME', amount: 5000000 }), // not expense
    ]
    expect(topExpenses(list, 2026, 6, 3).map((t) => t.id)).toEqual(['2', '3', '1'])
  })
})

describe('monthlySpending', () => {
  it('returns one bucket per month, oldest first, summing absolute expenses', () => {
    const now = new Date('2026-06-12T10:00:00')
    const list = [
      txn({ date: '2026-06-02', amount: -100 }),
      txn({ date: '2026-06-20', amount: -50 }), // future within month still counts
      txn({ date: '2026-05-15', amount: -200 }),
      txn({ date: '2026-01-15', amount: -999 }), // outside 3-month window
      txn({ date: '2026-05-01', type: 'INCOME', amount: 400 }),
    ]
    expect(monthlySpending(list, 3, now)).toEqual([
      { year: 2026, month: 4, total: 0 },
      { year: 2026, month: 5, total: 200 },
      { year: 2026, month: 6, total: 150 },
    ])
  })
})

describe('monthlyNetWorthPoints', () => {
  it('keeps the last point of each month, returning at most n months oldest-first', () => {
    const data = [
      { date: '2026-04-10', value: 10 }, { date: '2026-04-28', value: 12 },
      { date: '2026-05-31', value: 20 },
      { date: '2026-06-01', value: 25 }, { date: '2026-06-12', value: 30 },
    ]
    expect(monthlyNetWorthPoints(data, 2)).toEqual([
      { year: 2026, month: 5, value: 20 },
      { year: 2026, month: 6, value: 30 },
    ])
  })
  it('returns empty for empty input', () => {
    expect(monthlyNetWorthPoints([], 6)).toEqual([])
  })
})

describe('splitAccounts', () => {
  const acc = (over: Record<string, unknown>) =>
    ({ id: 'a', name: 'A', type: 'BANK', balance: 100, currency: 'IDR', ...over }) as never
  it('classifies CREDIT_CARD/MORTGAGE and negative balances as liabilities', () => {
    const accounts = [
      acc({ id: '1', type: 'BANK', balance: 100 }),
      acc({ id: '2', type: 'CREDIT_CARD', balance: -50 }),
      acc({ id: '3', type: 'MORTGAGE', balance: -400 }),
      acc({ id: '4', type: 'CASH', balance: -10 }),
      acc({ id: '5', type: 'INVESTMENT', currentBalance: 900, balance: 0 }),
    ]
    const { assets, liabilities, assetsTotal, liabilitiesTotal } = splitAccounts(accounts)
    expect(assets.map((a: { id: string }) => a.id)).toEqual(['1', '5'])
    expect(liabilities.map((a: { id: string }) => a.id)).toEqual(['2', '3', '4'])
    expect(assetsTotal).toBe(1000)        // 100 + 900 (currentBalance preferred)
    expect(liabilitiesTotal).toBe(460)    // |−50| + |−400| + |−10|
  })
  it('prefers currentBalanceInBase over currentBalance', () => {
    const accounts = [acc({ id: '1', type: 'BANK', balance: 5, currentBalance: 10, currentBalanceInBase: 7 })]
    expect(splitAccounts(accounts).assetsTotal).toBe(7)
  })
})

// Compare LOCAL date parts — toISOString() shifts to UTC and breaks in non-UTC timezones.
const localISO = (d: Date | null | undefined) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null

describe('projectNextOccurrence', () => {
  const today = new Date('2026-06-12T08:00:00')
  it('daily → tomorrow', () => {
    const t = txn({ is_recurring: true, recurring_frequency: 'daily', date: '2026-01-01' })
    expect(localISO(projectNextOccurrence(t, today))).toBe('2026-06-13')
  })
  it('weekly → next same weekday strictly after today', () => {
    // 2026-01-05 is a Monday; 2026-06-12 is a Friday → next Monday = 2026-06-15
    const t = txn({ is_recurring: true, recurring_frequency: 'weekly', date: '2026-01-05' })
    expect(localISO(projectNextOccurrence(t, today))).toBe('2026-06-15')
  })
  it('monthly → this month if day still ahead, else next month, clamped to month length', () => {
    const t15 = txn({ is_recurring: true, recurring_frequency: 'monthly', date: '2026-01-15' })
    expect(localISO(projectNextOccurrence(t15, today))).toBe('2026-06-15')
    const t10 = txn({ is_recurring: true, recurring_frequency: 'monthly', date: '2026-01-10' })
    expect(localISO(projectNextOccurrence(t10, today))).toBe('2026-07-10')
    const t31 = txn({ is_recurring: true, recurring_frequency: 'monthly', date: '2026-01-31' })
    // June has 30 days → clamps to 30
    expect(localISO(projectNextOccurrence(t31, today))).toBe('2026-06-30')
  })
  it('yearly → next anniversary', () => {
    const t = txn({ is_recurring: true, recurring_frequency: 'yearly', date: '2024-03-01' })
    expect(localISO(projectNextOccurrence(t, today))).toBe('2027-03-01')
  })
  it('returns null past recurring_end_date, for non-recurring, and for null frequency', () => {
    const ended = txn({ is_recurring: true, recurring_frequency: 'monthly', date: '2026-01-15', recurring_end_date: '2026-06-13' })
    expect(projectNextOccurrence(ended, today)).toBeNull()
    expect(projectNextOccurrence(txn({}), today)).toBeNull()
    expect(projectNextOccurrence(txn({ is_recurring: true }), today)).toBeNull()
  })
})

describe('upcomingRecurring', () => {
  const today = new Date('2026-06-12T08:00:00')
  it('returns soonest-first occurrences within the horizon, capped at max', () => {
    const list = [
      txn({ id: 'far', is_recurring: true, recurring_frequency: 'yearly', date: '2024-01-05' }),   // next year — outside horizon
      txn({ id: 'm15', is_recurring: true, recurring_frequency: 'monthly', date: '2026-01-15' }),  // Jun 15
      txn({ id: 'm20', is_recurring: true, recurring_frequency: 'monthly', date: '2026-01-20' }),  // Jun 20
      txn({ id: 'd', is_recurring: true, recurring_frequency: 'daily', date: '2026-01-01' }),      // Jun 13
      txn({ id: 'plain' }),
    ]
    const result = upcomingRecurring(list, today, 30, 2)
    expect(result.map((r) => r.transaction.id)).toEqual(['d', 'm15'])
    expect(localISO(result[0].date)).toBe('2026-06-13')
  })
  it('returns empty when nothing recurs', () => {
    expect(upcomingRecurring([txn({})], today, 30, 4)).toEqual([])
  })
})
