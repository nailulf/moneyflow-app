"use client"

import { useEffect, useMemo, useState, type ReactElement } from "react"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronLeft, ChevronRight, TableProperties } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import {
  type ScenarioDraft,
  defaultScenarioPayload,
  buildDraft,
} from "@/lib/forecast/types"
import {
  computeSuccessRate,
} from "@/lib/forecast/engine"
import {
  useForecastScenarios,
  useForecastEvents,
  useForecastNetWorth,
  useForecastCashflow,
  useForecastUserDOB,
  useCreateScenario,
} from "@/hooks/useForecastQuery"
import { buildProjectionInputs } from "@/lib/forecast/projection-inputs"
import { useForecastEngine } from "@/hooks/useForecastEngine"
import { computeInsights } from "@/lib/forecast/insights"
import { ForecastChart } from "@/components/features/forecast/ForecastChart"
import { ForecastHero } from "@/components/features/forecast/ForecastHero"
import { ForecastViewToggle, type RootChartView } from "@/components/features/forecast/ForecastViewToggle"
import { ForecastAssumptionsSummary } from "@/components/features/forecast/ForecastAssumptionsSummary"
import { ForecastInsightsCard } from "@/components/features/forecast/ForecastInsightsCard"
import { ForecastEventsPreview } from "@/components/features/forecast/ForecastEventsPreview"
import { ForecastScenarioSheet } from "@/components/features/forecast/ForecastScenarioSheet"
import { ScenarioCompareSheet } from "@/components/features/forecast/ScenarioCompareSheet"
import { StickyScreenHeader } from "@/components/features/navigation/StickyScreenHeader"
import { Button } from "@/components/ui/atoms/button"
import { useYearlySimulation, yearlyRowsToProjection } from "@/hooks/useYearlySimulation"
import { useScenarioComparisons } from "@/hooks/useScenarioComparisons"

export default function ForecastPage(): ReactElement {
  const { user } = useAuth()
  const tRoot = useTranslations("forecast.root")
  const router = useRouter()
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft | null>(null)
  const [chartView, setChartView] = useState<RootChartView>("net-worth")
  const [scenarioSheetOpen, setScenarioSheetOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)

  // --- React Query data ---
  const { data: scenarios = [], isLoading: scenariosLoading } = useForecastScenarios()
  const { data: events = [] } = useForecastEvents(selectedScenarioId)
  const { data: netWorthData } = useForecastNetWorth(user?.id)
  const netWorth = netWorthData?.currentNetWorth ?? null
  const { data: cashflowData } = useForecastCashflow()
  const { data: userDOB } = useForecastUserDOB()
  const monthlyCashflow = cashflowData?.median ?? 0
  const cashflowMonthsUsed = cashflowData?.monthsUsed ?? 0
  const baseAnnualIncome = cashflowData?.annualIncome ?? 0
  const baseAnnualExpenses = cashflowData?.annualExpenses ?? 0
  const monthlyIncomeBase = baseAnnualIncome / 12
  const monthlyExpenseBase = baseAnnualExpenses / 12

  // --- Per-scenario comparison rows (switcher + Compare sheet) ---
  const { rows: comparisonRows } = useScenarioComparisons()

  // --- Shared yearly simulation (single source of truth for NW chart + table) ---
  const { rows: yearlyRows, params: yearlyParams } = useYearlySimulation()
  const yearlyProjection = useMemo(
    () => yearlyRows.length > 0 ? yearlyRowsToProjection(yearlyRows) : null,
    [yearlyRows]
  )

  // --- Mutations ---
  const createScenario = useCreateScenario()

  // Auto-select scenario
  const selectedScenario = useMemo(() => {
    if (!selectedScenarioId) return null
    return scenarios.find((s) => s.id === selectedScenarioId) ?? null
  }, [scenarios, selectedScenarioId])

  useEffect(() => {
    if (scenarios.length > 0 && !selectedScenarioId) {
      const def = scenarios.find((s) => s.is_default) ?? scenarios[0]
      setSelectedScenarioId(def?.id ?? null)
    }
  }, [scenarios, selectedScenarioId])

  useEffect(() => {
    if (selectedScenario) setScenarioDraft(buildDraft(selectedScenario))
  }, [selectedScenario])

  // --- Derived computation ---

  const { eventMap, eventsByMonth, eventDetailsByMonth, retirementDateISO } = useMemo(
    () => scenarioDraft ? buildProjectionInputs(events, scenarioDraft)
      : { eventMap: new Map<string, number>(), eventsByMonth: new Map<string, string[]>(), eventDetailsByMonth: new Map(), retirementDateISO: null },
    [events, scenarioDraft],
  )

  const { projection, mcFinalValues, isComputing } = useForecastEngine(
    scenarioDraft, netWorth ?? null, monthlyIncomeBase, monthlyExpenseBase, eventMap, eventsByMonth, userDOB, eventDetailsByMonth, retirementDateISO,
  )

  const successRate = useMemo(() => {
    if (!mcFinalValues || !scenarioDraft) return null
    return computeSuccessRate(mcFinalValues, scenarioDraft.target_net_worth)
  }, [mcFinalValues, scenarioDraft])

  const insights = useMemo(
    () => computeInsights({ projection, scenarioDraft, netWorth, monthlyCashflow, cashflowMonthsUsed, successRate }),
    [projection, scenarioDraft, netWorth, monthlyCashflow, cashflowMonthsUsed, successRate],
  )

  // --- Handlers ---

  const handleCreateScenario = async (): Promise<void> => {
    const scenario = await createScenario.mutateAsync({ ...defaultScenarioPayload, name: "New Scenario", is_default: false })
    setSelectedScenarioId(scenario.id)
  }

  // --- Render ---

  const activeScenarioName = scenarios.find((s) => s.id === selectedScenarioId)?.name ?? ""
  const startYear = yearlyParams?.startYear ?? new Date().getFullYear()
  const horizon = scenarioDraft?.horizon_years ?? 0

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-[18px] pt-3 pb-10 md:max-w-2xl">
      <StickyScreenHeader>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={tRoot("back")}
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/50 active:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{tRoot("title")}</h1>
        </div>
        {activeScenarioName && (
          <button
            type="button"
            onClick={() => setScenarioSheetOpen(true)}
            className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-card"
          >
            <span className="max-w-[140px] truncate">{activeScenarioName}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      </StickyScreenHeader>

      {!scenarioDraft && scenariosLoading && (
        <div className="flex flex-col gap-[18px]">
          <div className="h-44 animate-pulse rounded-[20px] bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      )}
      {!scenarioDraft && !scenariosLoading && (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-8 text-center shadow-card">
          <p className="text-md font-semibold text-foreground">{tRoot("emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{tRoot("emptyBody")}</p>
          <Button onClick={() => { void handleCreateScenario() }}>{tRoot("createScenario")}</Button>
        </div>
      )}

      {scenarioDraft && (
        <>
          <ForecastHero
            projectedNetWorth={projection ? projection[projection.length - 1].deterministic : null}
            currentNetWorth={netWorth}
            targetNetWorth={scenarioDraft.target_net_worth}
            successRate={successRate}
            horizonYears={horizon}
            endYear={startYear + horizon}
          />

          <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="text-sm font-semibold text-foreground">
                  {chartView === "cash-flow" ? tRoot("incomeVsSpending") : tRoot("netWorthProjection")}
                </h2>
                {chartView === "cash-flow" && (
                  <p className="text-xs leading-caption text-muted-foreground">{tRoot("cashFlowSubtitle")}</p>
                )}
              </div>
              {chartView === "net-worth" && (
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
                    {tRoot("legendMedian")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-0.5 w-3 bg-success" />
                    {tRoot("legendGoal")}
                  </span>
                </div>
              )}
            </div>
            <ForecastChart
              view={chartView}
              projection={projection}
              yearlyProjection={yearlyProjection}
              isLoading={scenariosLoading || isComputing}
              netWorth={netWorth}
              scenarioDraft={scenarioDraft}
              monthlyCashflow={monthlyCashflow}
              baseAnnualIncome={baseAnnualIncome}
              baseAnnualExpenses={baseAnnualExpenses}
              events={events}
              successRate={successRate}
            />
          </div>

          <ForecastViewToggle
            value={chartView}
            onChange={(v) => setChartView(v)}
          />

          <ForecastAssumptionsSummary
            scenarioDraft={scenarioDraft}
            onEdit={() => router.push(`/forecast/assumptions?scenario=${selectedScenarioId ?? ""}`)}
          />

          <ForecastInsightsCard insights={insights} />

          <ForecastEventsPreview
            events={events}
            onManage={() => router.push(`/forecast/events?scenario=${selectedScenarioId ?? ""}`)}
          />

          <button
            type="button"
            onClick={() => router.push(`/forecast/simulation?scenario=${selectedScenarioId ?? ""}`)}
            className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-muted">
              <TableProperties className="size-4 text-primary" />
            </span>
            <span className="flex-1 text-left text-sm font-medium text-foreground">{tRoot("yearByYear")}</span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
        </>
      )}

      <ForecastScenarioSheet
        open={scenarioSheetOpen}
        onOpenChange={setScenarioSheetOpen}
        rows={comparisonRows}
        selectedScenarioId={selectedScenarioId}
        onSelect={(id) => {
          setSelectedScenarioId(id)
          setScenarioSheetOpen(false)
        }}
        onNew={async () => {
          setScenarioSheetOpen(false)
          const c = await createScenario.mutateAsync({ ...defaultScenarioPayload, name: "New scenario", is_default: false })
          router.push(`/forecast/assumptions?scenario=${c.id}`)
        }}
        onCompare={() => {
          setScenarioSheetOpen(false)
          setCompareOpen(true)
        }}
      />
      <ScenarioCompareSheet
        open={compareOpen}
        onOpenChange={setCompareOpen}
        rows={comparisonRows}
        selectedScenarioId={selectedScenarioId}
      />
    </div>
  )
}
