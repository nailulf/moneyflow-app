import { financialHealthScore } from '@/lib/onboarding/plan-math'

describe('financialHealthScore', () => {
  it('scores a healthy profile high (>=70) with all factors good', () => {
    const result = financialHealthScore({
      income: 10_000_000,
      spending: 6_000_000, // 40% savings rate
      savings: 30_000_000, // 5 months of spending
      investments: 20_000_000,
      debt: 0,
      debtPayment: 0,
    })

    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.breakdown.netSavings).toBe('good')
    expect(result.breakdown.emergencyFund).toBe('good')
    expect(result.breakdown.investing).toBe('good')
    expect(result.breakdown.debt).toBe('good')
    expect(result.savingsRate).toBe(40)
    expect(result.emergencyMonths).toBeCloseTo(5)
  })

  it('scores an overspending, indebted profile low', () => {
    const healthy = financialHealthScore({
      income: 10_000_000,
      spending: 6_000_000,
      savings: 30_000_000,
      investments: 20_000_000,
      debt: 0,
      debtPayment: 0,
    })
    const struggling = financialHealthScore({
      income: 5_000_000,
      spending: 6_000_000, // spending exceeds income
      savings: 0,
      investments: 0,
      debt: 80_000_000,
      debtPayment: 2_000_000,
    })

    expect(struggling.score).toBeLessThan(healthy.score)
    expect(struggling.score).toBeLessThan(40)
    expect(struggling.breakdown.netSavings).toBe('low')
    expect(struggling.breakdown.emergencyFund).toBe('low')
    expect(struggling.breakdown.investing).toBe('low')
    expect(struggling.breakdown.debt).toBe('low')
  })

  it('returns 0 for non-positive income', () => {
    const result = financialHealthScore({
      income: 0,
      spending: 0,
      savings: 0,
      investments: 0,
      debt: 0,
      debtPayment: 0,
    })
    expect(result.score).toBe(0)
  })

  it('clamps the score to the 0-100 range', () => {
    const result = financialHealthScore({
      income: 10_000_000,
      spending: 1_000_000,
      savings: 100_000_000,
      investments: 100_000_000,
      debt: 0,
      debtPayment: 0,
    })
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('flags a watch-level savings rate and emergency fund', () => {
    const result = financialHealthScore({
      income: 10_000_000,
      spending: 9_000_000, // 10% savings rate -> watch
      savings: 18_000_000, // 2 months -> watch
      investments: 0,
      debt: 0,
      debtPayment: 0,
    })
    expect(result.breakdown.netSavings).toBe('watch')
    expect(result.breakdown.emergencyFund).toBe('watch')
    expect(result.breakdown.investing).toBe('low')
  })
})
