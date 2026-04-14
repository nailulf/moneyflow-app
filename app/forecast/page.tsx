"use client"

import { useEffect, useMemo, useState, type ReactElement } from "react"

import { useTranslations } from "next-intl"
import { Info, MoreVertical } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { PageLayout, TopContent } from "@/components/PageLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/molecules/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/molecules/tabs"
import { Button } from "@/components/ui/atoms/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/molecules/select"
import { formatCurrency } from "@/lib/data-utils"
import {
  type ScenarioDraft,
  type ComparisonRow,
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
import { ForecastChart, type ForecastChartView } from "@/components/features/forecast/ForecastChart"
import { ForecastSummary } from "@/components/features/forecast/ForecastSummary"
import { CustomizeSheet } from "@/components/features/forecast/CustomizeSheet"
import { SimulationTable } from "@/components/features/forecast/SimulationTable"

export default function ForecastPage(): ReactElement {
  const { user } = useAuth()
  const t = useTranslations("forecast")
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft | null>(null)
  const [chartView, setChartView] = useState<ForecastChartView>("net-worth")
  const [sheetOpen, setSheetOpen] = useState(false)

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
    scenarioDraft, netWorth ?? null, monthlyCashflow, eventMap, eventsByMonth, userDOB, eventDetailsByMonth, retirementDateISO,
  )

  const successRate = useMemo(() => {
    if (!mcFinalValues || !scenarioDraft) return null
    return computeSuccessRate(mcFinalValues, scenarioDraft.target_net_worth)
  }, [mcFinalValues, scenarioDraft])

  const insights = useMemo(() => {
    if (!projection || !scenarioDraft || netWorth === null) return []
    const finalPoint = projection[projection.length - 1]
    const notes: string[] = []

    const targetLabel = scenarioDraft.target_net_worth > 0
      ? t("insights.targetAbove", { amount: formatCurrency(scenarioDraft.target_net_worth) })
      : t("insights.targetPositive")
    if (successRate !== null && successRate < 50) {
      notes.push(t("insights.lowSuccess", { targetLabel }))
    } else if (successRate !== null && successRate >= 90) {
      notes.push(t("insights.highSuccess", { targetLabel }))
    }
    if (finalPoint.p50 < netWorth) {
      notes.push(t("insights.belowToday"))
    }
    if (scenarioDraft.include_cashflow && monthlyCashflow < 0) {
      notes.push(
        cashflowMonthsUsed >= 2
          ? t("insights.negativeCashflowMonths", { months: cashflowMonthsUsed })
          : t("insights.negativeCashflow"),
      )
    }
    if (scenarioDraft.annual_volatility > 0.2) {
      notes.push(t("insights.highVolatility"))
    }
    if (notes.length === 0) {
      notes.push(t("insights.onTrack"))
    }
    return notes
  }, [projection, scenarioDraft, netWorth, monthlyCashflow, cashflowMonthsUsed, successRate, t])

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

  return (
    <div className="flex flex-col h-full">
      <PageLayout>
        <TopContent>
          <Card className="rounded-lg shadow-sm">
            {/* Header: scenario dropdown + actions */}
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Select
                  value={selectedScenarioId ?? undefined}
                  onValueChange={setSelectedScenarioId}
                >
                  <SelectTrigger className="w-auto min-w-[160px] border-none shadow-none font-semibold text-base">
                    <SelectValue placeholder={t("settings.selectScenario")} />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Tab toggle + CTA */}
              <div className="flex items-center justify-between">
                <Tabs
                  value={chartView}
                  onValueChange={(v) => setChartView(v as ForecastChartView)}
                >
                  <TabsList>
                    <TabsTrigger value="net-worth">{t("tabs.netWorth")}</TabsTrigger>
                    <TabsTrigger value="cash-flow">{t("tabs.cashFlow")}</TabsTrigger>
                    <TabsTrigger value="simulation">{t("tabs.simulation")}</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button onClick={() => setSheetOpen(true)}>
                  {t("addEventsCustomize")}
                </Button>
              </div>

              {/* Chart area */}
              <ForecastChart
                view={chartView}
                projection={projection}
                isLoading={scenariosLoading || isComputing}
                netWorth={netWorth}
                scenarioDraft={scenarioDraft}
                monthlyCashflow={monthlyCashflow}
                baseAnnualIncome={baseAnnualIncome}
                baseAnnualExpenses={baseAnnualExpenses}
                events={events}
                successRate={successRate}
              />

              {/* Summary strip */}
              <ForecastSummary insights={insights} />
            </CardContent>
          </Card>

          <SimulationTable />
        </TopContent>
      </PageLayout>

      {/* Customize Sheet */}
      <CustomizeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
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
