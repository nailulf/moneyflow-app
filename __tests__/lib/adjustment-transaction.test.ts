import { computeAdjustmentDelta, buildAdjustmentPayload } from '@/lib/adjustment-transaction'

describe('computeAdjustmentDelta', () => {
  it('positive delta → INCOME', () => {
    expect(computeAdjustmentDelta(1500, 1000)).toEqual({ type: 'INCOME', amount: 500 })
  })
  it('negative delta → EXPENSE with positive amount', () => {
    expect(computeAdjustmentDelta(800, 1000)).toEqual({ type: 'EXPENSE', amount: 200 })
  })
  it('zero delta → null (no-op)', () => {
    expect(computeAdjustmentDelta(1000, 1000)).toBeNull()
  })
})

describe('buildAdjustmentPayload', () => {
  it('builds a flagged, categorized adjustment transaction', () => {
    const p = buildAdjustmentPayload({
      userId: 'u', accountId: 'A', newBalance: 1500, currentBalance: 1000,
      categoryId: 'other-expense', currency: 'IDR', date: '2026-06-13',
    })
    expect(p).toMatchObject({
      user_id: 'u', account_id: 'A', type: 'INCOME', amount: 500,
      currency: 'IDR', date: '2026-06-13', is_balance_adjustment: true,
      is_recurring: false, description: 'Balance adjustment',
    })
  })
  it('returns null when there is no delta', () => {
    expect(buildAdjustmentPayload({
      userId: 'u', accountId: 'A', newBalance: 1000, currentBalance: 1000,
      categoryId: 'c', currency: 'IDR', date: '2026-06-13',
    })).toBeNull()
  })
})
