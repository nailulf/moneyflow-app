import { computeProjection } from '@/lib/forecast/engine'
import { defaultScenarioPayload } from '@/lib/forecast/types'

function end(incomeGrowth: number, inflation: number, retirementDateISO: string | null = null) {
  const draft = {
    ...defaultScenarioPayload,
    horizon_years: 1, start_date: '2026-01-01',
    inflation_rate: inflation, annual_income_growth: incomeGrowth,
    expected_annual_return: 0, annual_volatility: 0,
    monthly_contribution: 0, monthly_withdrawal: 0, include_cashflow: true,
  } as any
  const res = computeProjection(draft, 0, 1_000_000, 0, new Map(), new Map(), null, undefined, retirementDateISO)
  return res.projection[res.projection.length - 1].deterministic
}

describe('engine income-growth', () => {
  it('income compounds at annual_income_growth, not inflation', () => {
    expect(end(0.08, 0.03)).toBeGreaterThan(end(0.03, 0.03))
  })
  it('income_growth = 0 means flat income (12 × 1,000,000)', () => {
    expect(Math.round(end(0, 0.05))).toBe(12_000_000)
  })
  it('income_growth = inflation reproduces the old inflation-linked income', () => {
    const inflation = 0.04
    let oldSum = 0
    for (let i = 1; i <= 12; i++) oldSum += 1_000_000 * Math.pow(1 + inflation, i / 12)
    expect(Math.round(end(inflation, inflation))).toBe(Math.round(oldSum))
  })
  it('post-retirement income stays 0', () => {
    expect(end(0.08, 0.03, '2026-01-01')).toBe(0)
  })
})
