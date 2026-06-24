"use client"

import { useEffect, useMemo, useState, type ReactElement } from "react"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronLeft } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import {
  type ScenarioDraft,
  defaultScenarioPayload,
  buildDraft,
} from "@/lib/forecast/types"
import {
  getMonthKey,
  computeSuccessRate,
  computeCAGR,
} from "@/lib/forecast/engine"
import {
  useForecastScenarios,
  useForecastEvents,
  useForecastNetWorth,
  useForecastCashflow,
  useForecastUserDOB,
  useSaveScenario,
  useCreateScenario,
  useDeleteScenario,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useToggleEvent,
} from "@/hooks/useForecastQuery"
import { buildEventImpactMap } from "@/lib/forecast/event-impact"
import { useForecastEngine } from "@/hooks/useForecastEngine"
import { computeInsights } from "@/lib/forecast/insights"
import { ForecastChart } from "@/components/features/forecast/ForecastChart"
import { ForecastHero } from "@/components/features/forecast/ForecastHero"
import { ForecastViewToggle, type RootChartView } from "@/components/features/forecast/ForecastViewToggle"
import { ForecastAssumptionsSummary } from "@/components/features/forecast/ForecastAssumptionsSummary"
import { ForecastInsightsCard } from "@/components/features/forecast/ForecastInsightsCard"
import { ForecastEventsPreview } from "@/components/features/forecast/ForecastEventsPreview"
import { ForecastScenarioSheet } from "@/components/features/forecast/ForecastScenarioSheet"
import { CustomizeSheet } from "@/components/features/forecast/CustomizeSheet"
import { SimulationTable } from "@/components/features/forecast/SimulationTable"
import { StickyScreenHeader } from "@/components/features/navigation/StickyScreenHeader"
import { Button } from "@/components/ui/atoms/button"
import { useYearlySimulation, yearlyRowsToProjection } from "@/hooks/useYearlySimulation"

export default function ForecastPage(): ReactElement {
  const { user } = useAuth()
  const tRoot = useTranslations("forecast.root")
  const router = useRouter()
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft | null>(null)
  const [chartView, setChartView] = useState<RootChartView>("net-worth")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scenarioSheetOpen, setScenarioSheetOpen] = useState(false)
  const [customizeTab, setCustomizeTab] = useState<"settings" | "events">("settings")

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

  // --- Shared yearly simulation (single source of truth for NW chart + table) ---
  const { rows: yearlyRows, params: yearlyParams, events: yearlyEvents } = useYearlySimulation()
  const yearlyProjection = useMemo(
    () => yearlyRows.length > 0 ? yearlyRowsToProjection(yearlyRows) : null,
    [yearlyRows]
  )

  const computedCAGR = useMemo(() => {
    if (!netWorthData?.historicalData) return null
    return computeCAGR(netWorthData.historicalData)
  }, [netWorthData])

  // --- Mutations ---
  const saveScenario = useSaveScenario()
  const createScenario = useCreateScenario()
  const deleteScenario = useDeleteScenario()
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent(selectedScenarioId)
  const deleteEvent = useDeleteEvent(selectedScenarioId)
  const toggleEvent = useToggleEvent(selectedScenarioId)

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

  const eventMap = useMemo(() => {
    if (!scenarioDraft) return new Map<string, number>()
    const startYear = new Date(scenarioDraft.start_date).getFullYear()
    return buildEventImpactMap(events, startYear, scenarioDraft.horizon_years, scenarioDraft.inflation_rate)
  }, [events, scenarioDraft])

  const eventsByMonth = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const event of events) {
      if (event.is_enabled === false) continue
      const exactKey = getMonthKey(new Date(event.event_date))
      const janKey = `${new Date(event.event_date).getFullYear()}-01`
      // Index by both exact month and January so dots/tooltips show on either
      for (const key of new Set([exactKey, janKey])) {
        map.set(key, [...(map.get(key) ?? []), event.event_type])
      }
    }
    return map
  }, [events])

  const eventDetailsByMonth = useMemo(() => {
    const map = new Map<string, { name: string; type: string; amount: number }[]>()
    for (const event of events) {
      if (event.is_enabled === false) continue
      const exactKey = getMonthKey(new Date(event.event_date))
      const janKey = `${new Date(event.event_date).getFullYear()}-01`
      for (const key of new Set([exactKey, janKey])) {
        const existing = map.get(key) ?? []
        // Avoid duplicates if exact month IS January
        if (key === janKey && exactKey === janKey && existing.some((e) => e.name === event.name)) continue
        existing.push({ name: event.name, type: event.event_type, amount: Number(event.amount) })
        map.set(key, existing)
      }
    }
    return map
  }, [events])

  // Find retirement event date for the engine
  const retirementDateISO = useMemo(() => {
    const retEvent = events.find((e) => e.event_type === "RETIREMENT" && e.is_enabled !== false)
    return retEvent ? retEvent.event_date : null
  }, [events])

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

  const handleScenarioSave = async (): Promise<void> => {
    if (!scenarioDraft || !selectedScenarioId) return
    await saveScenario.mutateAsync({ scenarioId: selectedScenarioId, draft: scenarioDraft })
  }

  const handleEventSubmit = async (payload: {
    scenario_id: string
    name: string
    event_date: string
    event_type: string
    amount: number
    note: string | null
    details?: Record<string, unknown>
  }): Promise<void> => {
    await createEvent.mutateAsync(payload)
  }

  const handleEventUpdate = async (
    eventId: string,
    payload: {
      name: string
      event_date: string
      amount: number
      details: Record<string, unknown>
    },
  ): Promise<void> => {
    await updateEvent.mutateAsync({ eventId, ...payload })
  }

  const handleToggleEvent = async (eventId: string, is_enabled: boolean): Promise<void> => {
    await toggleEvent.mutateAsync({ eventId, is_enabled })
  }

  const handleCreateScenario = async (): Promise<void> => {
    const scenario = await createScenario.mutateAsync({ ...defaultScenarioPayload, name: "New Scenario", is_default: false })
    setSelectedScenarioId(scenario.id)
  }

  const handleDuplicateScenario = async (): Promise<void> => {
    if (!scenarioDraft) return
    const scenario = await createScenario.mutateAsync({ ...scenarioDraft, name: `${scenarioDraft.name} (Copy)`, is_default: false })
    setSelectedScenarioId(scenario.id)
  }

  const handleDeleteScenario = async (): Promise<void> => {
    if (!selectedScenarioId || scenarios.length <= 1) return
    await deleteScenario.mutateAsync(selectedScenarioId)
    setSelectedScenarioId(null)
  }

  const handleDeleteEvent = async (eventId: string): Promise<void> => {
    await deleteEvent.mutateAsync(eventId)
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
            <h2 className="text-sm font-semibold text-foreground">
              {chartView === "cash-flow" ? tRoot("cashFlow") : tRoot("netWorth")}
            </h2>
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
            onEdit={() => {
              setCustomizeTab("settings")
              setSheetOpen(true)
            }}
          />

          <ForecastInsightsCard insights={insights} />

          <ForecastEventsPreview
            events={events}
            onManage={() => {
              setCustomizeTab("events")
              setSheetOpen(true)
            }}
          />

          <div className="hidden md:block">
            <SimulationTable rows={yearlyRows} params={yearlyParams} events={yearlyEvents} />
          </div>
        </>
      )}

      <ForecastScenarioSheet
        open={scenarioSheetOpen}
        onOpenChange={setScenarioSheetOpen}
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onSelect={(id) => {
          setSelectedScenarioId(id)
          setScenarioSheetOpen(false)
        }}
      />

      <CustomizeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialTab={customizeTab}
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        scenarioDraft={scenarioDraft}
        isSaving={saveScenario.isPending}
        monthlyCashflow={monthlyCashflow}
        cashflowMonthsUsed={cashflowMonthsUsed}
        computedCAGR={computedCAGR}
        onSelectScenario={setSelectedScenarioId}
        onDraftChange={setScenarioDraft}
        onSave={handleScenarioSave}
        onCreate={handleCreateScenario}
        onDuplicate={handleDuplicateScenario}
        onDelete={handleDeleteScenario}
        events={events}
        onEventSubmit={handleEventSubmit}
        onEventUpdate={handleEventUpdate}
        onEventDelete={handleDeleteEvent}
        onEventToggle={handleToggleEvent}
      />
    </div>
  )
}
