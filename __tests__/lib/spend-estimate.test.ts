import { estimateSpend } from '@/lib/onboarding/spend-estimate'

describe('estimateSpend', () => {
  it('uses the per-category ratio, rounded to the nearest 50,000', () => {
    // 10,000,000 * 0.28 = 2,800,000 (already a multiple of 50k)
    expect(estimateSpend('Housing & rent', 10_000_000)).toBe(2_800_000)
    // 10,000,000 * 0.20 = 2,000,000
    expect(estimateSpend('Food & groceries', 10_000_000)).toBe(2_000_000)
    // 10,000,000 * 0.10 = 1,000,000
    expect(estimateSpend('Transport', 10_000_000)).toBe(1_000_000)
  })

  it('rounds to the nearest 50,000', () => {
    // 7,300,000 * 0.08 = 584,000 -> nearest 50k = 600,000
    expect(estimateSpend('Bills & subscriptions', 7_300_000)).toBe(600_000)
  })

  it('falls back to the 0.05 default for unknown categories', () => {
    // 10,000,000 * 0.05 = 500,000
    expect(estimateSpend('Pet care', 10_000_000)).toBe(500_000)
  })

  it('returns 0 for non-positive or invalid income', () => {
    expect(estimateSpend('Housing & rent', 0)).toBe(0)
    expect(estimateSpend('Housing & rent', -100)).toBe(0)
    expect(estimateSpend('Housing & rent', NaN)).toBe(0)
  })
})
