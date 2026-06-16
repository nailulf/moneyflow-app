import { financialHealthScore } from '@/lib/onboarding/plan-math'

describe('financialHealthScore', () => {
  it('scores a healthy profile high (>=80) with all factors good', () => {
    const result = financialHealthScore({
      income: 10_000_000,
      spending: 6_000_000, // 40% savings rate
      savings: 30_000_000, // 5 months of spending
      investments: 20_000_000,
      debt: 0,
      debtPayment: 0,
    })

    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.breakdown.savingsRatio).toBe('good')
    expect(result.breakdown.emergencyFund).toBe('good')
    expect(result.breakdown.debtToIncome).toBe('good')
    expect(result.breakdown.netWorth).toBe('good')
    // Raw values for the sub-labels.
    expect(result.savingsRate).toBe(40)
    expect(result.debtToIncomePct).toBe(0)
    expect(result.emergencyMonths).toBeCloseTo(5)
    expect(result.netWorth).toBe(50_000_000)
  })

  it('scores an overspending, indebted, negative-net-worth profile low', () => {
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
      spending: 6_000_000, // spending exceeds income -> low savings ratio
      savings: 0, // no emergency fund
      investments: 0,
      debt: 80_000_000, // net worth deeply negative
      debtPayment: 3_000_000, // 60% debt-to-income -> low
    })

    expect(struggling.score).toBeLessThan(healthy.score)
    expect(struggling.score).toBeLessThan(40)
    expect(struggling.breakdown.savingsRatio).toBe('low')
    expect(struggling.breakdown.emergencyFund).toBe('low')
    expect(struggling.breakdown.debtToIncome).toBe('low')
    expect(struggling.breakdown.netWorth).toBe('low')
    // Raw values.
    expect(struggling.savingsRate).toBe(-20)
    expect(struggling.debtToIncomePct).toBe(60)
    expect(struggling.emergencyMonths).toBe(0)
    expect(struggling.netWorth).toBe(-80_000_000)
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
    expect(result.savingsRate).toBe(0)
    expect(result.debtToIncomePct).toBe(0)
    expect(result.emergencyMonths).toBe(0)
    expect(result.netWorth).toBe(0)
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

  it('flags watch-level savings ratio, emergency fund and debt-to-income', () => {
    const result = financialHealthScore({
      income: 10_000_000,
      spending: 9_000_000, // 10% savings rate -> watch
      savings: 18_000_000, // 2 months -> watch
      investments: 0,
      debt: 5_000_000,
      debtPayment: 3_000_000, // 30% debt-to-income -> watch
    })
    expect(result.breakdown.savingsRatio).toBe('watch')
    expect(result.breakdown.emergencyFund).toBe('watch')
    expect(result.breakdown.debtToIncome).toBe('watch')
    // savings + investments - debt = 18m - 5m = 13m -> positive -> good
    expect(result.breakdown.netWorth).toBe('good')
    expect(result.savingsRate).toBe(10)
    expect(result.debtToIncomePct).toBe(30)
    expect(result.emergencyMonths).toBeCloseTo(2)
    expect(result.netWorth).toBe(13_000_000)
  })

  it('marks net worth as watch when assets exactly offset debt', () => {
    const result = financialHealthScore({
      income: 10_000_000,
      spending: 5_000_000,
      savings: 10_000_000,
      investments: 0,
      debt: 10_000_000, // net worth = 0
      debtPayment: 1_000_000,
    })
    expect(result.netWorth).toBe(0)
    expect(result.breakdown.netWorth).toBe('watch')
  })
})
