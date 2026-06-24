import { computeInsights } from "@/lib/forecast/insights"
import { defaultScenarioPayload } from "@/lib/forecast/types"

function proj(p50: number) {
  // minimal ProjectionPoint[] — only fields the util reads (p50) matter; cast to satisfy the type.
  return [{ p50: 0 } as any, { p50 } as any]
}
const draft = (over: Record<string, unknown> = {}) => ({ ...defaultScenarioPayload, ...over } as any)

describe("computeInsights", () => {
  it("returns [] when inputs are incomplete", () => {
    expect(computeInsights({ projection: null, scenarioDraft: draft(), netWorth: 0, monthlyCashflow: 0, cashflowMonthsUsed: 0, successRate: 0 })).toEqual([])
  })
  it("flags lowSuccess (with target) when success < 50", () => {
    const r = computeInsights({ projection: proj(2_000), scenarioDraft: draft({ target_net_worth: 5_000 }), netWorth: 1_000, monthlyCashflow: 100, cashflowMonthsUsed: 3, successRate: 40 })
    expect(r[0]).toEqual({ code: "lowSuccess", targetNetWorth: 5_000 })
  })
  it("flags highSuccess when success >= 90", () => {
    const r = computeInsights({ projection: proj(9_000), scenarioDraft: draft({ target_net_worth: 5_000 }), netWorth: 1_000, monthlyCashflow: 100, cashflowMonthsUsed: 3, successRate: 95 })
    expect(r.some(i => i.code === "highSuccess")).toBe(true)
  })
  it("flags belowToday when final p50 < current net worth", () => {
    const r = computeInsights({ projection: proj(500), scenarioDraft: draft(), netWorth: 1_000, monthlyCashflow: 100, cashflowMonthsUsed: 0, successRate: 70 })
    expect(r.some(i => i.code === "belowToday")).toBe(true)
  })
  it("flags negativeCashflowMonths when cashflow<0 and months>=2", () => {
    const r = computeInsights({ projection: proj(9_999), scenarioDraft: draft({ include_cashflow: true }), netWorth: 1_000, monthlyCashflow: -50, cashflowMonthsUsed: 4, successRate: 70 })
    expect(r).toContainEqual({ code: "negativeCashflowMonths", months: 4 })
  })
  it("flags negativeCashflow when cashflow<0 and months<2", () => {
    const r = computeInsights({ projection: proj(9_999), scenarioDraft: draft({ include_cashflow: true }), netWorth: 1_000, monthlyCashflow: -50, cashflowMonthsUsed: 1, successRate: 70 })
    expect(r).toContainEqual({ code: "negativeCashflow" })
  })
  it("flags highVolatility when annual_volatility > 0.2", () => {
    const r = computeInsights({ projection: proj(9_999), scenarioDraft: draft({ annual_volatility: 0.25 }), netWorth: 1_000, monthlyCashflow: 100, cashflowMonthsUsed: 0, successRate: 70 })
    expect(r.some(i => i.code === "highVolatility")).toBe(true)
  })
  it("falls back to onTrack when nothing else fires", () => {
    const r = computeInsights({ projection: proj(9_999), scenarioDraft: draft({ annual_volatility: 0.1 }), netWorth: 1_000, monthlyCashflow: 100, cashflowMonthsUsed: 0, successRate: 70 })
    expect(r).toEqual([{ code: "onTrack" }])
  })
})
