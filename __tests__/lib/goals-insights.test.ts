import { monthlyInflowRate, projectCompletionDate, consistencyStreak, requiredMonthly } from '@/lib/goals/insights'

const tx = (o: any) => ({
  account_id: 'a',
  to_account_id: null,
  type: 'INCOME',
  amount: 0,
  date: '2026-06-01',
  ...o,
})

describe('goals/insights', () => {
  describe('monthlyInflowRate', () => {
    it('averages net monthly inflow', () => {
      const txns = [
        tx({ amount: 1_000_000, date: '2026-06-10' }),
        tx({ type: 'EXPENSE', amount: 200_000, date: '2026-06-12' }),
      ]
      expect(monthlyInflowRate(txns as any, 'a', new Date('2026-06-30'), 6)).toBeGreaterThan(0)
    })

    it('includes transfers in and out', () => {
      const txns = [
        tx({ type: 'TRANSFER', account_id: 'b', to_account_id: 'a', amount: 500_000, date: '2026-06-05' }),
        tx({ type: 'TRANSFER', to_account_id: 'b', amount: 100_000, date: '2026-06-10' }),
      ]
      const rate = monthlyInflowRate(txns as any, 'a', new Date('2026-06-30'), 6)
      expect(rate).toBeGreaterThan(0)
    })

    it('returns 0 for no transactions', () => {
      expect(monthlyInflowRate([], 'a', new Date('2026-06-30'), 6)).toBe(0)
    })

    it('filters by trailing months window', () => {
      const txns = [
        tx({ amount: 1_000_000, date: '2026-06-01' }),
        tx({ amount: 1_000_000, date: '2026-01-01' }), // 5+ months back
      ]
      const rate = monthlyInflowRate(txns as any, 'a', new Date('2026-06-30'), 6)
      // Should include both (June and Jan are within 6-month window from June 30)
      expect(rate).toBeGreaterThan(0)
    })

    it('includes a txn exactly at the cutoff month and excludes one a month before', () => {
      // asOf=2026-06-30, months=6 => cutoff = startOfMonth(2026-01) = 2026-01-01.
      // A txn at the cutoff month is IN; a txn in 2025-12 (one month before) is OUT.
      const atCutoff = [tx({ amount: 600_000, date: '2026-01-31' })]
      const beforeCutoff = [tx({ amount: 600_000, date: '2025-12-31' })]

      expect(monthlyInflowRate(atCutoff as any, 'a', new Date('2026-06-30'), 6)).toBeGreaterThan(0)
      expect(monthlyInflowRate(beforeCutoff as any, 'a', new Date('2026-06-30'), 6)).toBe(0)
    })
  })

  describe('projectCompletionDate', () => {
    it('projects a completion date when rate > 0', () => {
      const d = projectCompletionDate(0, 1_200_000, 1_200_000, new Date('2026-06-30'))
      expect(d).toBeTruthy()
      expect(d).toMatch(/\d{4}-\d{2}-\d{2}/)
    })

    it('returns null when rate <= 0', () => {
      expect(projectCompletionDate(0, 100, 0, new Date('2026-06-30'))).toBeNull()
      expect(projectCompletionDate(0, 100, -50, new Date('2026-06-30'))).toBeNull()
    })

    it('returns null when already completed', () => {
      const d = projectCompletionDate(1_200_000, 1_000_000, 100_000, new Date('2026-06-30'))
      expect(d).toBeNull()
    })

    it('computes ISO date in YYYY-MM-DD format', () => {
      const d = projectCompletionDate(0, 1_000_000, 100_000, new Date('2026-06-30'))
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('consistencyStreak', () => {
    it('counts consecutive positive-inflow months', () => {
      const txns = [
        tx({ amount: 100, date: '2026-06-05' }),
        tx({ amount: 100, date: '2026-05-05' }),
      ]
      expect(consistencyStreak(txns as any, 'a', new Date('2026-06-30'))).toBeGreaterThanOrEqual(2)
    })

    it('returns 0 when no positive months', () => {
      const txns = [tx({ type: 'EXPENSE', amount: 100, date: '2026-06-05' })]
      expect(consistencyStreak(txns as any, 'a', new Date('2026-06-30'))).toBe(0)
    })

    it('breaks streak on negative month', () => {
      const txns = [
        tx({ amount: 100, date: '2026-06-05' }), // June: +100
        tx({ type: 'EXPENSE', amount: 200, date: '2026-05-05' }), // May: -200
        tx({ amount: 100, date: '2026-04-05' }), // April: +100
      ]
      const streak = consistencyStreak(txns as any, 'a', new Date('2026-06-30'))
      expect(streak).toBe(1) // Only June counts
    })

    it('handles current month correctly', () => {
      const txns = [
        tx({ amount: 100, date: '2026-06-15' }), // Current month
      ]
      expect(consistencyStreak(txns as any, 'a', new Date('2026-06-30'))).toBeGreaterThanOrEqual(1)
    })
  })

  describe('requiredMonthly', () => {
    it('wraps calculateRequiredSavings', () => {
      const result = requiredMonthly(1_000_000, 12)
      expect(result).toBeGreaterThan(0)
      expect(typeof result).toBe('number')
    })

    it('returns 0 when no remaining balance', () => {
      const result = requiredMonthly(0, 12)
      expect(result).toBe(0)
    })
  })
})
