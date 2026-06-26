'use client'

import { useQueries } from "@tanstack/react-query"
import { computeProjection, computeSuccessRate } from "@/lib/forecast/engine"
import { buildProjectionInputs } from "@/lib/forecast/projection-inputs"
import {
  buildDraft,
  type ComparisonRow,
  type ForecastScenario,
  type ForecastEvent,
} from "@/lib/forecast/types"
import {
  useForecastScenarios,
  useForecastNetWorth,
  useForecastCashflow,
  useForecastUserDOB,
} from "@/hooks/useForecastQuery"
import { useAuth } from "@/contexts/AuthContext"
import { queryKeys } from "@/hooks/useDataRefresh"

export interface ComparisonInputs {
  netWorth: number
  monthlyIncomeBase: number
  monthlyExpenseBase: number
  dob: string | null
}

/**
 * Pure helper: project a single scenario and reduce it to a ComparisonRow
 * (projected end value + Monte-Carlo success rate against the target).
 */
export function buildComparisonRow(
  scenario: ForecastScenario,
  events: ForecastEvent[],
  inputs: ComparisonInputs,
): ComparisonRow {
  const draft = buildDraft(scenario)
  const { eventMap, eventsByMonth, eventDetailsByMonth, retirementDateISO } =
    buildProjectionInputs(events, draft)
  const dobDate = inputs.dob ? new Date(inputs.dob) : null
  const { projection, mcFinalValues } = computeProjection(
    draft,
    inputs.netWorth,
    inputs.monthlyIncomeBase,
    inputs.monthlyExpenseBase,
    eventMap,
    eventsByMonth,
    dobDate,
    eventDetailsByMonth,
    retirementDateISO,
  )
  return {
    id: scenario.id,
    name: scenario.name,
    isDefault: scenario.is_default,
    endValue: projection[projection.length - 1].deterministic,
    successRate: computeSuccessRate(mcFinalValues, draft.target_net_worth),
  }
}

/**
 * Computes a ComparisonRow per scenario for the scenario switcher / Compare view.
 * Fetches every scenario's events in parallel via useQueries, then reuses the
 * shared net-worth / cashflow / DOB inputs across all rows.
 */
export function useScenarioComparisons(): { rows: ComparisonRow[]; isLoading: boolean } {
  const { user } = useAuth()
  const { data: scenarios = [], isLoading: scenariosLoading } = useForecastScenarios()
  const { data: netWorthData } = useForecastNetWorth(user?.id)
  const { data: cashflowData } = useForecastCashflow()
  const { data: dob } = useForecastUserDOB()

  const eventQueries = useQueries({
    queries: scenarios.map((s) => ({
      queryKey: queryKeys.forecastEvents(s.id),
      queryFn: async () => {
        const res = await fetch(`/api/wealth-forecast/events?scenarioId=${s.id}`, {
          cache: "no-store",
        })
        if (!res.ok) return [] as ForecastEvent[]
        return (await res.json()) as ForecastEvent[]
      },
    })),
  })

  const inputs: ComparisonInputs = {
    netWorth: netWorthData?.currentNetWorth ?? 0,
    monthlyIncomeBase: (cashflowData?.annualIncome ?? 0) / 12,
    monthlyExpenseBase: (cashflowData?.annualExpenses ?? 0) / 12,
    dob: dob ?? null,
  }

  const rows = scenarios.map((s, i) =>
    buildComparisonRow(s, (eventQueries[i]?.data ?? []) as ForecastEvent[], inputs),
  )

  return {
    rows,
    isLoading: scenariosLoading || eventQueries.some((q) => q.isLoading),
  }
}
