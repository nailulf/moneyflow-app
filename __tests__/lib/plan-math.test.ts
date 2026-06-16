import { monthlyContributionForGoal, monthsToGoal, healthScore } from '@/lib/onboarding/plan-math'

describe('plan-math', () => {
  it('computes required monthly contribution for a target + horizon', () => {
    expect(monthlyContributionForGoal(12_000_000, 6)).toBe(2_000_000)
  })
  it('computes months to reach a goal given monthly surplus', () => {
    expect(monthsToGoal(10_000_000, 2_500_000)).toBe(4)
  })
  it('returns Infinity months when there is no surplus', () => {
    expect(monthsToGoal(10_000_000, 0)).toBe(Infinity)
  })
  it('scores financial health 0-100 from income/spend', () => {
    expect(healthScore({ income: 10_000_000, spend: 6_000_000 })).toBeGreaterThan(50)
    expect(healthScore({ income: 10_000_000, spend: 10_000_000 }))
      .toBeLessThan(healthScore({ income: 10_000_000, spend: 6_000_000 }))
  })
})
