"use client"

import { useEffect, useMemo, useState, type ReactElement } from "react"
import { addMonths } from "date-fns"
import { useAuth } from "@/contexts/AuthContext"
import { PageLayout, TopContent, ContentWrapper, MainContent, SideContent } from "@/components/PageLayout"
import { formatCurrency } from "@/lib/data-utils"
import {
  type ScenarioDraft,
  type ComparisonRow,
  defaultScenarioPayload,
  buildDraft,
} from "@/lib/forecast/types"
import {
  getMonthKey,
  calculateRealMonthlyRate,
  runMonteCarlo,
  computeSuccessRate,
  computeCAGR,
} from "@/lib/forecast/engine"
import { useForecastEngine } from "@/hooks/useForecastEngine"
import {
  useForecastScenarios,
  useForecastEvents,
  useForecastNetWorth,
  useForecastCashflow,
  useSaveScenario,
  useCreateScenario,
  useDeleteScenario,
  useCreateEvent,
  useDeleteEvent,
} from "@/hooks/useForecastQuery"
import { ForecastStatsBar } from "@/components/features/forecast/ForecastStatsBar"
import { ForecastChart } from "@/components/features/forecast/ForecastChart"
import { ScenarioSettings } from "@/components/features/forecast/ScenarioSettings"
import { ScenarioComparison } from "@/components/features/forecast/ScenarioComparison"
import { EventSchedule } from "@/components/features/forecast/EventSchedule"
import { InsightsPanel } from "@/components/features/forecast/InsightsPanel"

export default function ForecastPage(): ReactElement {
  const { user } = useAuth()
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft | null>(null)

  // --- React Query data ---
  const { data: scenarios = [], isLoading: scenariosLoading } = useForecastScenarios()
  const { data: events = [] } = useForecastEvents(selectedScenarioId)
  const { data: netWorthData } = useForecastNetWorth(user?.id)
  const netWorth = netWorthData?.currentNetWorth ?? null
  const { data: cashflowData } = useForecastCashflow()
  const monthlyCashflow = cashflowData?.median ?? 0
  const cashflowMonthsUsed = cashflowData?.monthsUsed ?? 0

  // Compute CAGR from historical data (6+ months required)
  const computedCAGR = useMemo(() => {
    if (!netWorthData?.historicalData) return null
    return computeCAGR(netWorthData.historicalData)
  }, [netWorthData])

  // --- Mutations ---
  const saveScenario = useSaveScenario()
  const createScenario = useCreateScenario()
  const deleteScenario = useDeleteScenario()
  const createEvent = useCreateEvent()
  const deleteEvent = useDeleteEvent(selectedScenarioId)

  // Auto-select scenario when data loads
  const selectedScenario = useMemo(() => {
    if (!selectedScenarioId) return null
    return scenarios.find((s) => s.id === selectedScenarioId) ?? null
  }, [scenarios, selectedScenarioId])

  useEffect(() => {
    if (scenarios.length > 0 && !selectedScenarioId) {
      const defaultScenario = scenarios.find((s) => s.is_default) ?? scenarios[0]
      setSelectedScenarioId(defaultScenario?.id ?? null)
    }
  }, [scenarios, selectedScenarioId])

  useEffect(() => {
    if (selectedScenario) setScenarioDraft(buildDraft(selectedScenario))
  }, [selectedScenario])

  // --- Derived computation ---

  const eventMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const event of events) {
      const key = getMonthKey(new Date(event.event_date))
      // All life events are costs — subtracted from net worth
      map.set(key, (map.get(key) ?? 0) - Number(event.amount))
    }
    return map
  }, [events])

  const eventsByMonth = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const event of events) {
      const key = getMonthKey(new Date(event.event_date))
      map.set(key, [...(map.get(key) ?? []), event.event_type])
    }
    return map
  }, [events])

  const { projection, mcFinalValues, isComputing } = useForecastEngine(
    scenarioDraft, netWorth ?? null, monthlyCashflow, eventMap, eventsByMonth,
  )

  const successRate = useMemo(() => {
    if (!mcFinalValues || !scenarioDraft) return null
    return computeSuccessRate(mcFinalValues, scenarioDraft.target_net_worth)
  }, [mcFinalValues, scenarioDraft])

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    if (netWorth === null) return []
    return scenarios.map((scenario) => {
      const months = Math.max(1, scenario.horizon_years * 12)
      const baseDate = new Date(scenario.start_date)
      const inflationRate = Number(scenario.inflation_rate)
      const meanMonthly = calculateRealMonthlyRate(Number(scenario.expected_annual_return), inflationRate)
      const volatilityMonthly = Number(scenario.annual_volatility) / Math.sqrt(12)
      const baseCashflow =
        Number(scenario.monthly_contribution) - Number(scenario.monthly_withdrawal) +
        (scenario.include_cashflow ? monthlyCashflow : 0)
      const scenarioEventMap = scenario.id === selectedScenarioId ? eventMap : new Map<string, number>()

      let value = netWorth
      for (let i = 1; i <= months; i += 1) {
        const monthDate = addMonths(baseDate, i)
        const rawEvent = scenarioEventMap.get(getMonthKey(monthDate)) ?? 0
        const eventAdj = rawEvent !== 0 ? rawEvent * Math.pow(1 + inflationRate, i / 12) : 0
        value = value * (1 + meanMonthly) + baseCashflow + eventAdj
      }

      const target = Number(scenario.target_net_worth)
      const { finalValues } = runMonteCarlo(netWorth, months, meanMonthly, volatilityMonthly, baseCashflow, scenarioEventMap, baseDate, 200, inflationRate)

      return {
        id: scenario.id,
        name: scenario.name,
        endValue: value,
        isDefault: scenario.is_default,
        successRate: computeSuccessRate(finalValues, target),
      }
    })
  }, [scenarios, netWorth, monthlyCashflow, eventMap, selectedScenarioId])

  const insights = useMemo(() => {
    if (!projection || !scenarioDraft || netWorth === null) return []
    const finalPoint = projection[projection.length - 1]
    const notes: string[] = []

    const targetLabel = scenarioDraft.target_net_worth > 0
      ? `above target (${formatCurrency(scenarioDraft.target_net_worth)})`
      : "positive"
    if (successRate !== null && successRate < 50) {
      notes.push(`Less than half of simulated paths end ${targetLabel}. Review return assumptions or increase contributions.`)
    } else if (successRate !== null && successRate >= 90) {
      notes.push(`Strong forecast: 90%+ of simulations end ${targetLabel} at the horizon.`)
    }
    if (finalPoint.p50 < netWorth) {
      notes.push("Projected median wealth ends below today. Consider increasing contributions or reducing withdrawals.")
    }
    if (scenarioDraft.include_cashflow && monthlyCashflow < 0) {
      notes.push(
        cashflowMonthsUsed >= 2
          ? `Negative median cashflow (${cashflowMonthsUsed}-month sample) drags the forecast. Improve cashflow or disable cashflow inclusion.`
          : "Negative average cashflow drags the forecast. Improve cashflow or disable cashflow inclusion.",
      )
    }
    if (scenarioDraft.annual_volatility > 0.2) {
      notes.push("High volatility increases downside risk. Balance allocations to smooth returns.")
    }
    if (scenarioDraft.horizon_years < 5) {
      notes.push("Short horizons magnify market timing risk. Consider extending the horizon.")
    }
    if (notes.length === 0) {
      notes.push("Scenario is on track. Keep monitoring contributions and adjust if goals change.")
    }
    return notes
  }, [projection, scenarioDraft, netWorth, monthlyCashflow, cashflowMonthsUsed, successRate])

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
  }): Promise<void> => {
    await createEvent.mutateAsync(payload)
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
          <ForecastStatsBar
            netWorth={netWorth}
            projection={projection}
            successRate={successRate}
            cashflowMonthsUsed={cashflowMonthsUsed}
          />
        </TopContent>
        <ContentWrapper>
          <MainContent>
            <div className="space-y-6">
              <ForecastChart
                projection={projection}
                isLoading={scenariosLoading || isComputing}
                scenarioDraft={scenarioDraft}
                monthlyCashflow={monthlyCashflow}
                eventMap={eventMap}
                successRate={successRate}
              />
              <ScenarioSettings
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
              />
            </div>
          </MainContent>
          <SideContent>
            <div className="space-y-4">
              <ScenarioComparison rows={comparisonRows} selectedScenarioId={selectedScenarioId} />
              <EventSchedule
                events={events}
                selectedScenarioId={selectedScenarioId}
                onSubmit={handleEventSubmit}
                onDelete={handleDeleteEvent}
              />
              <InsightsPanel insights={insights} />
            </div>
          </SideContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}
