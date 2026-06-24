import type { ProjectionPoint, ScenarioDraft } from "@/lib/forecast/types"

export type Insight =
  | { code: "lowSuccess"; targetNetWorth: number }
  | { code: "highSuccess"; targetNetWorth: number }
  | { code: "belowToday" }
  | { code: "negativeCashflow" }
  | { code: "negativeCashflowMonths"; months: number }
  | { code: "highVolatility" }
  | { code: "onTrack" }

export interface InsightsInput {
  projection: ProjectionPoint[] | null
  scenarioDraft: ScenarioDraft | null
  netWorth: number | null
  monthlyCashflow: number
  cashflowMonthsUsed: number
  successRate: number | null
}

export function computeInsights(input: InsightsInput): Insight[] {
  const { projection, scenarioDraft, netWorth, monthlyCashflow, cashflowMonthsUsed, successRate } = input
  if (!projection || !scenarioDraft || netWorth === null) return []
  const finalPoint = projection[projection.length - 1]
  const notes: Insight[] = []

  if (successRate !== null && successRate < 50) {
    notes.push({ code: "lowSuccess", targetNetWorth: scenarioDraft.target_net_worth })
  } else if (successRate !== null && successRate >= 90) {
    notes.push({ code: "highSuccess", targetNetWorth: scenarioDraft.target_net_worth })
  }
  if (finalPoint.p50 < netWorth) notes.push({ code: "belowToday" })
  if (scenarioDraft.include_cashflow && monthlyCashflow < 0) {
    notes.push(cashflowMonthsUsed >= 2
      ? { code: "negativeCashflowMonths", months: cashflowMonthsUsed }
      : { code: "negativeCashflow" })
  }
  if (scenarioDraft.annual_volatility > 0.2) notes.push({ code: "highVolatility" })
  if (notes.length === 0) notes.push({ code: "onTrack" })
  return notes
}
