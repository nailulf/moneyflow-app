import { buildComparisonRow } from "@/hooks/useScenarioComparisons"

const scenario = (over: any = {}) => ({
  id: "s1", name: "Base", is_default: true, start_date: "2026-01-01", horizon_years: 10,
  expected_annual_return: 0.07, annual_volatility: 0, inflation_rate: 0.03, annual_income_growth: 0,
  monthly_contribution: 1000000, monthly_withdrawal: 0, target_net_worth: 5000000000, include_cashflow: false,
  description: "", ...over,
})
const inputs = { netWorth: 0, monthlyIncomeBase: 0, monthlyExpenseBase: 0, dob: null }

describe("buildComparisonRow", () => {
  it("returns id/name/isDefault and a positive endValue from the projection", () => {
    const r = buildComparisonRow(scenario() as any, [], inputs)
    expect(r.id).toBe("s1"); expect(r.name).toBe("Base"); expect(r.isDefault).toBe(true)
    expect(r.endValue).toBeGreaterThan(0)
    expect(r.successRate).toBeGreaterThanOrEqual(0)
    expect(r.successRate).toBeLessThanOrEqual(100)
  })
  it("a higher contribution yields a higher endValue", () => {
    const lo = buildComparisonRow(scenario({ monthly_contribution: 500000 }) as any, [], inputs)
    const hi = buildComparisonRow(scenario({ monthly_contribution: 5000000 }) as any, [], inputs)
    expect(hi.endValue).toBeGreaterThan(lo.endValue)
  })
})
