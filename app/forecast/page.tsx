"use client"

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react"
import { format, addMonths } from "date-fns"
import { LineChart, Line, XAxis, YAxis } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { PageLayout, TopContent, ContentWrapper, MainContent, SideContent } from "@/components/PageLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/molecules/card"
import { Input } from "@/components/ui/atoms/input"
import { Label } from "@/components/ui/atoms/label"
import { Button } from "@/components/ui/atoms/button"
import { Switch } from "@/components/ui/atoms/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/molecules/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/organisms/chart"
import { formatCurrency, formatCurrencyCompact } from "@/lib/data-utils"
import type { Database } from "@/types/database"

type ForecastScenario = Database["public"]["Tables"]["wealth_forecast_scenarios"]["Row"]
type ForecastEvent = Database["public"]["Tables"]["wealth_forecast_events"]["Row"]

type NetWorthResponse = {
  currentNetWorth: number
}

type MonthlyDataPoint = {
  netCashFlow: number
  transactionCount: number
}

type MonthlyCashflowResponse = {
  monthlyData: MonthlyDataPoint[]
}

type ProjectionPoint = {
  date: string
  monthKey: string
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  deterministic: number
  hasEvent: boolean
  eventTypes: string[]
}

type ScenarioDraft = {
  name: string
  description: string | null
  start_date: string
  horizon_years: number
  expected_annual_return: number
  annual_volatility: number
  inflation_rate: number
  monthly_contribution: number
  monthly_withdrawal: number
  include_cashflow: boolean
  is_default: boolean
}

const chartConfig = {
  p10: {
    label: "P10",
    color: "hsl(var(--chart-2))",
  },
  p25: {
    label: "P25",
    color: "hsl(var(--chart-2))",
  },
  p50: {
    label: "Median",
    color: "hsl(var(--chart-3))",
  },
  p75: {
    label: "P75",
    color: "hsl(var(--chart-4))",
  },
  p90: {
    label: "P90",
    color: "hsl(var(--chart-4))",
  },
  deterministic: {
    label: "Deterministic",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

// Lucide-compatible SVG path data per event type
const EVENT_ICON_PATHS: Record<string, string> = {
  CONTRIBUTION: "M12 5v14M5 12h14",
  WITHDRAWAL: "M5 12h14",
  INCOME: "M22 7l-8.5 8.5-5-5L2 17",
  EXPENSE: "M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18",
  ADJUSTMENT: "M4 6h16M4 12h8M4 18h16",
}

const EVENT_DOT_COLORS: Record<string, string> = {
  CONTRIBUTION: "hsl(var(--chart-1))",
  INCOME: "hsl(var(--success, 142 71% 45%))",
  WITHDRAWAL: "hsl(var(--destructive))",
  EXPENSE: "hsl(var(--destructive))",
  ADJUSTMENT: "hsl(var(--muted-foreground))",
}

function EventDot(props: {
  cx?: number
  cy?: number
  payload?: ProjectionPoint
  index?: number
}): ReactElement {
  const { cx = 0, cy = 0, payload, index } = props
  if (!payload?.hasEvent) return <g key={index} />
  const primaryType = payload.eventTypes[0] ?? "CONTRIBUTION"
  const color = EVENT_DOT_COLORS[primaryType] ?? "hsl(var(--chart-1))"
  const iconPath = EVENT_ICON_PATHS[primaryType] ?? EVENT_ICON_PATHS.CONTRIBUTION
  const r = 13
  const iconAreaSize = r * 2 - 10
  const iconScale = iconAreaSize / 24

  return (
    <g key={index}>
      <line
        x1={cx}
        y1={cy + r + 2}
        x2={cx}
        y2={cy + r + 20}
        stroke="hsl(var(--border))"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="hsl(var(--background))"
        stroke={color}
        strokeWidth={1.5}
      />
      <g transform={`translate(${cx - iconAreaSize / 2}, ${cy - iconAreaSize / 2}) scale(${iconScale})`}>
        <path
          d={iconPath}
          fill="none"
          stroke={color}
          strokeWidth={2.5 / iconScale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>
  )
}

const defaultScenarioPayload = {
  name: "Base Scenario",
  description: "Default forecast",
  start_date: new Date().toISOString().split("T")[0],
  horizon_years: 10,
  expected_annual_return: 0.07,
  annual_volatility: 0.12,
  inflation_rate: 0.03,
  // Contribution and withdrawal default to 0 — cashflow is captured via include_cashflow
  monthly_contribution: 0,
  monthly_withdrawal: 0,
  include_cashflow: true,
  is_default: true,
}

const toPercent = (value: number): number => Number((value * 100).toFixed(2))
const fromPercent = (value: number): number => value / 100

const getMonthKey = (date: Date): string => format(date, "yyyy-MM")

const calculateRealMonthlyRate = (annualReturn: number, annualInflation: number): number =>
  Math.pow((1 + annualReturn) / (1 + annualInflation), 1 / 12) - 1

const randomNormal = (): number => {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

const percentile = (values: number[], p: number): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)))
  return sorted[index]
}

const medianOf = (values: number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

const buildDraft = (scenario: ForecastScenario): ScenarioDraft => ({
  name: scenario.name,
  description: scenario.description,
  start_date: scenario.start_date,
  horizon_years: scenario.horizon_years,
  expected_annual_return: Number(scenario.expected_annual_return),
  annual_volatility: Number(scenario.annual_volatility),
  inflation_rate: Number(scenario.inflation_rate),
  monthly_contribution: Number(scenario.monthly_contribution),
  monthly_withdrawal: Number(scenario.monthly_withdrawal),
  include_cashflow: scenario.include_cashflow,
  is_default: scenario.is_default,
})

const runMonteCarlo = (
  netWorth: number,
  months: number,
  meanMonthly: number,
  volatilityMonthly: number,
  baseCashflow: number,
  eventMap: Map<string, number>,
  baseDate: Date,
  simulations: number,
): number[][] => {
  const series: number[][] = Array.from({ length: months + 1 }, () => [])
  for (let sim = 0; sim < simulations; sim += 1) {
    let value = netWorth
    series[0].push(value)
    for (let i = 1; i <= months; i += 1) {
      const monthDate = addMonths(baseDate, i)
      const eventAdjustment = eventMap.get(getMonthKey(monthDate)) ?? 0
      const monthlyFlow = baseCashflow + eventAdjustment
      const shock = randomNormal()
      const monthlyReturn = meanMonthly + volatilityMonthly * shock
      value = value * (1 + monthlyReturn) + monthlyFlow
      series[i].push(value)
    }
  }
  return series
}

export default function ForecastPage(): ReactElement {
  const { user } = useAuth()
  const [scenarios, setScenarios] = useState<ForecastScenario[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft | null>(null)
  const [events, setEvents] = useState<ForecastEvent[]>([])
  const [netWorth, setNetWorth] = useState<number | null>(null)
  const [monthlyCashflow, setMonthlyCashflow] = useState<number>(0)
  const [cashflowMonthsUsed, setCashflowMonthsUsed] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [eventForm, setEventForm] = useState({
    event_date: new Date().toISOString().split("T")[0],
    event_type: "CONTRIBUTION",
    amount: 0,
    note: "",
  })

  const selectedScenario = useMemo(() => {
    if (!selectedScenarioId) return null
    return scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null
  }, [scenarios, selectedScenarioId])

  const loadScenarios = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    const response = await fetch("/api/wealth-forecast/scenarios", { cache: "no-store" })
    if (!response.ok) {
      setIsLoading(false)
      return
    }
    const data = (await response.json()) as ForecastScenario[]
    if (data.length === 0) {
      const created = await fetch("/api/wealth-forecast/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultScenarioPayload),
      })
      if (created.ok) {
        const scenario = (await created.json()) as ForecastScenario
        setScenarios([scenario])
        setSelectedScenarioId(scenario.id)
        setScenarioDraft(buildDraft(scenario))
      }
      setIsLoading(false)
      return
    }
    setScenarios(data)
    const defaultScenario = data.find((scenario) => scenario.is_default) ?? data[0]
    setSelectedScenarioId(defaultScenario?.id ?? null)
    if (defaultScenario) {
      setScenarioDraft(buildDraft(defaultScenario))
    }
    setIsLoading(false)
  }, [])

  const loadEvents = useCallback(async (scenarioId: string): Promise<void> => {
    const response = await fetch(`/api/wealth-forecast/events?scenarioId=${scenarioId}`, {
      cache: "no-store",
    })
    if (!response.ok) {
      setEvents([])
      return
    }
    const data = (await response.json()) as ForecastEvent[]
    setEvents(data)
  }, [])

  const loadNetWorth = useCallback(async (): Promise<void> => {
    if (!user?.id) return
    const response = await fetch(`/api/net-worth?userId=${user.id}&period=1Y`, {
      cache: "no-store",
    })
    if (!response.ok) return
    const data = (await response.json()) as NetWorthResponse
    setNetWorth(data.currentNetWorth ?? 0)
  }, [user])

  const loadMonthlyCashflow = useCallback(async (): Promise<void> => {
    // Fetch up to 12 months to compute a robust median
    const response = await fetch("/api/transactions/monthly?months=12", { cache: "no-store" })
    if (!response.ok) return
    const data = (await response.json()) as MonthlyCashflowResponse
    const allMonths = data.monthlyData ?? []

    // Use months that have actual transactions; fall back to all months if fewer than 2 qualify
    const withData = allMonths.filter((m) => m.transactionCount > 0)
    const source = withData.length >= 2 ? withData : allMonths

    if (source.length === 0) {
      setMonthlyCashflow(0)
      setCashflowMonthsUsed(0)
      return
    }

    const median = medianOf(source.map((m) => m.netCashFlow))
    setMonthlyCashflow(median)
    setCashflowMonthsUsed(source.length)
  }, [])

  useEffect(() => {
    void loadScenarios()
  }, [loadScenarios])

  useEffect(() => {
    if (!selectedScenarioId) return
    void loadEvents(selectedScenarioId)
  }, [selectedScenarioId, loadEvents])

  useEffect(() => {
    void loadNetWorth()
    void loadMonthlyCashflow()
  }, [loadNetWorth, loadMonthlyCashflow])

  useEffect(() => {
    if (!selectedScenario) return
    setScenarioDraft(buildDraft(selectedScenario))
  }, [selectedScenario])

  const eventMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const event of events) {
      const key = getMonthKey(new Date(event.event_date))
      const sign =
        event.event_type === "WITHDRAWAL" || event.event_type === "EXPENSE"
          ? -1
          : 1
      const current = map.get(key) ?? 0
      map.set(key, current + sign * Number(event.amount))
    }
    return map
  }, [events])

  const eventsByMonth = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const event of events) {
      const key = getMonthKey(new Date(event.event_date))
      const existing = map.get(key) ?? []
      map.set(key, [...existing, event.event_type])
    }
    return map
  }, [events])

  const projection = useMemo(() => {
    if (!scenarioDraft || netWorth === null) return null
    const months = Math.max(1, scenarioDraft.horizon_years * 12)
    const baseDate = new Date(scenarioDraft.start_date)
    const meanMonthly = calculateRealMonthlyRate(
      scenarioDraft.expected_annual_return,
      scenarioDraft.inflation_rate
    )
    const volatilityMonthly = Number(scenarioDraft.annual_volatility) / Math.sqrt(12)
    const baseCashflow =
      Number(scenarioDraft.monthly_contribution) -
      Number(scenarioDraft.monthly_withdrawal) +
      (scenarioDraft.include_cashflow ? monthlyCashflow : 0)

    // Deterministic path (no randomness)
    const deterministicSeries: number[] = []
    let deterministicValue = netWorth
    deterministicSeries.push(deterministicValue)
    for (let i = 1; i <= months; i += 1) {
      const monthDate = addMonths(baseDate, i)
      const eventAdjustment = eventMap.get(getMonthKey(monthDate)) ?? 0
      const monthlyFlow = baseCashflow + eventAdjustment
      deterministicValue = deterministicValue * (1 + meanMonthly) + monthlyFlow
      deterministicSeries.push(deterministicValue)
    }

    // Monte Carlo — 500 simulations
    const simulations = 500
    const series = runMonteCarlo(
      netWorth,
      months,
      meanMonthly,
      volatilityMonthly,
      baseCashflow,
      eventMap,
      baseDate,
      simulations,
    )

    const points: ProjectionPoint[] = []
    for (let i = 0; i <= months; i += 1) {
      const dateLabel = format(addMonths(baseDate, i), "MMM yyyy")
      const monthKey = getMonthKey(addMonths(baseDate, i))
      const values = series[i]
      points.push({
        date: dateLabel,
        monthKey,
        p10: percentile(values, 0.1),
        p25: percentile(values, 0.25),
        p50: percentile(values, 0.5),
        p75: percentile(values, 0.75),
        p90: percentile(values, 0.9),
        deterministic: deterministicSeries[i],
        hasEvent: eventMap.has(monthKey),
        eventTypes: eventsByMonth.get(monthKey) ?? [],
      })
    }
    return points
  }, [scenarioDraft, netWorth, monthlyCashflow, eventMap, eventsByMonth])

  // Success rate: % of final MC values >= 0
  const successRate = useMemo(() => {
    if (!projection) return null
    const final = projection[projection.length - 1]
    // We stored percentile data, not raw paths — recompute from p10/p50/p90 relationship
    // Approximate: if p10 >= 0 then ~90%+ success; interpolate linearly between known percentiles
    if (final.p10 >= 0) return 90
    if (final.p50 >= 0) {
      // Between 50% and 90% success — interpolate linearly
      const range = final.p50 - final.p10
      if (range <= 0) return 50
      const fraction = (0 - final.p10) / range
      return Math.round(50 + fraction * 40)
    }
    if (final.p90 >= 0) {
      const range = final.p90 - final.p50
      if (range <= 0) return 10
      const fraction = (0 - final.p50) / range
      return Math.round(10 + (1 - fraction) * 40)
    }
    return 10
  }, [projection])

  const comparisonRows = useMemo(() => {
    if (netWorth === null) return []
    return scenarios.map((scenario) => {
      const months = Math.max(1, scenario.horizon_years * 12)
      const baseDate = new Date(scenario.start_date)
      const meanMonthly = calculateRealMonthlyRate(
        Number(scenario.expected_annual_return),
        Number(scenario.inflation_rate)
      )
      const volatilityMonthly = Number(scenario.annual_volatility) / Math.sqrt(12)
      const baseCashflow =
        Number(scenario.monthly_contribution) -
        Number(scenario.monthly_withdrawal) +
        (scenario.include_cashflow ? monthlyCashflow : 0)

      // Deterministic end value
      let value = netWorth
      for (let i = 1; i <= months; i += 1) {
        const monthDate = addMonths(baseDate, i)
        const eventAdjustment = scenario.id === selectedScenarioId
          ? eventMap.get(getMonthKey(monthDate)) ?? 0
          : 0
        value = value * (1 + meanMonthly) + baseCashflow + eventAdjustment
      }

      // Lightweight MC for success rate (200 paths)
      const compSimulations = 200
      const compSeries = runMonteCarlo(
        netWorth,
        months,
        meanMonthly,
        volatilityMonthly,
        baseCashflow,
        scenario.id === selectedScenarioId ? eventMap : new Map(),
        baseDate,
        compSimulations,
      )
      const finalValues = compSeries[months]
      const successCount = finalValues.filter((v) => v >= 0).length
      const scenarioSuccessRate = Math.round((successCount / compSimulations) * 100)

      return {
        id: scenario.id,
        name: scenario.name,
        endValue: value,
        isDefault: scenario.is_default,
        successRate: scenarioSuccessRate,
      }
    })
  }, [scenarios, netWorth, monthlyCashflow, eventMap, selectedScenarioId])

  const insights = useMemo(() => {
    if (!projection || !scenarioDraft || netWorth === null) return []
    const finalPoint = projection[projection.length - 1]
    const notes: string[] = []

    if (successRate !== null && successRate < 50) {
      notes.push("Less than half of simulated paths end positive. Review return assumptions or increase contributions.")
    } else if (successRate !== null && successRate >= 90) {
      notes.push("Strong forecast: 90%+ of simulations end in positive territory at the horizon.")
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

  const handleScenarioSave = async (): Promise<void> => {
    if (!scenarioDraft || !selectedScenarioId) return
    setIsSaving(true)
    const response = await fetch(`/api/wealth-forecast/scenarios/${selectedScenarioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: scenarioDraft.name,
        description: scenarioDraft.description,
        start_date: scenarioDraft.start_date,
        horizon_years: scenarioDraft.horizon_years,
        expected_annual_return: scenarioDraft.expected_annual_return,
        annual_volatility: scenarioDraft.annual_volatility,
        inflation_rate: scenarioDraft.inflation_rate,
        monthly_contribution: scenarioDraft.monthly_contribution,
        monthly_withdrawal: scenarioDraft.monthly_withdrawal,
        include_cashflow: scenarioDraft.include_cashflow,
        is_default: scenarioDraft.is_default,
      }),
    })
    if (response.ok) {
      await loadScenarios()
    }
    setIsSaving(false)
  }

  const handleEventSubmit = async (): Promise<void> => {
    if (!selectedScenarioId) return
    const payload = {
      scenario_id: selectedScenarioId,
      event_date: eventForm.event_date,
      event_type: eventForm.event_type,
      amount: Number(eventForm.amount),
      note: eventForm.note || null,
    }
    const response = await fetch("/api/wealth-forecast/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (response.ok) {
      setEventForm((prev) => ({
        ...prev,
        amount: 0,
        note: "",
      }))
      if (selectedScenarioId) {
        await loadEvents(selectedScenarioId)
      }
    }
  }

  const handleCreateScenario = async (): Promise<void> => {
    const response = await fetch("/api/wealth-forecast/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...defaultScenarioPayload, name: "New Scenario", is_default: false }),
    })
    if (response.ok) {
      const scenario = (await response.json()) as ForecastScenario
      await loadScenarios()
      setSelectedScenarioId(scenario.id)
    }
  }

  const handleDuplicateScenario = async (): Promise<void> => {
    if (!scenarioDraft) return
    const response = await fetch("/api/wealth-forecast/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...scenarioDraft,
        name: `${scenarioDraft.name} (Copy)`,
        is_default: false,
      }),
    })
    if (response.ok) {
      const scenario = (await response.json()) as ForecastScenario
      await loadScenarios()
      setSelectedScenarioId(scenario.id)
    }
  }

  const handleDeleteScenario = async (): Promise<void> => {
    if (!selectedScenarioId || scenarios.length <= 1) return
    const response = await fetch(`/api/wealth-forecast/scenarios/${selectedScenarioId}`, {
      method: "DELETE",
    })
    if (response.ok) {
      await loadScenarios()
    }
  }

  const handleDeleteEvent = async (eventId: string): Promise<void> => {
    const response = await fetch(`/api/wealth-forecast/events/${eventId}`, { method: "DELETE" })
    if (response.ok && selectedScenarioId) {
      await loadEvents(selectedScenarioId)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageLayout>
        <TopContent>
          <Card className="rounded-lg shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Wealth Forecast</CardTitle>
              <CardDescription>
                Model your net worth trajectory with scenarios, events, and market risk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground">Current Net Worth</p>
                  <p className="text-lg font-semibold">
                    {netWorth !== null ? formatCurrency(netWorth) : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground">Median Outcome</p>
                  <p className="text-lg font-semibold">
                    {projection ? formatCurrency(projection[projection.length - 1].p50) : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground">Downside (P10)</p>
                  <p className="text-lg font-semibold text-destructive">
                    {projection ? formatCurrency(projection[projection.length - 1].p10) : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                  <p className={`text-lg font-semibold ${successRate !== null && successRate >= 70 ? "text-success" : successRate !== null && successRate < 50 ? "text-destructive" : ""}`}>
                    {successRate !== null ? `${successRate}%` : "—"}
                  </p>
                  {cashflowMonthsUsed > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cashflow: {cashflowMonthsUsed}-mo median
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TopContent>
        <ContentWrapper>
          <MainContent>
            <div className="space-y-6">
              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Scenario Projection</CardTitle>
                  <CardDescription>
                    Monte Carlo range (500 paths) plus deterministic baseline for the selected scenario.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projection ? (
                    <ChartContainer config={chartConfig} className="h-96 w-full">
                      <LineChart data={projection} margin={{ top: 16, right: 24, left: 8, bottom: 40 }}>
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          minTickGap={40}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <YAxis
                          orientation="right"
                          tickLine={false}
                          axisLine={false}
                          minTickGap={40}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          tickFormatter={(value) => formatCurrencyCompact(Number(value))}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => [formatCurrency(Number(value)), name]}
                            />
                          }
                        />
                        {/* Outer uncertainty band — P10 / P90 */}
                        <Line
                          type="monotone"
                          dataKey="p90"
                          stroke="var(--color-p90)"
                          strokeWidth={1}
                          dot={false}
                          strokeDasharray="4 3"
                          opacity={0.35}
                        />
                        <Line
                          type="monotone"
                          dataKey="p10"
                          stroke="var(--color-p10)"
                          strokeWidth={1}
                          dot={false}
                          strokeDasharray="4 3"
                          opacity={0.35}
                        />
                        {/* Inner band — P25 / P75 */}
                        <Line
                          type="monotone"
                          dataKey="p75"
                          stroke="var(--color-p75)"
                          strokeWidth={1.2}
                          dot={false}
                          strokeDasharray="5 3"
                          opacity={0.5}
                        />
                        <Line
                          type="monotone"
                          dataKey="p25"
                          stroke="var(--color-p25)"
                          strokeWidth={1.2}
                          dot={false}
                          strokeDasharray="5 3"
                          opacity={0.5}
                        />
                        {/* Median — medium weight dashed */}
                        <Line
                          type="monotone"
                          dataKey="p50"
                          stroke="var(--color-p50)"
                          strokeWidth={1.5}
                          dot={false}
                          strokeDasharray="6 3"
                          opacity={0.75}
                        />
                        {/* Deterministic — prominent solid line with event anchors */}
                        <Line
                          type="monotone"
                          dataKey="deterministic"
                          stroke="var(--color-deterministic)"
                          strokeWidth={2.5}
                          dot={<EventDot />}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
                      {isLoading ? "Loading scenarios..." : "No projection available"}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Scenario Settings</CardTitle>
                  <CardDescription>Adjust assumptions and save to update the forecast.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="scenario-select">Scenario</Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedScenarioId ?? undefined}
                          onValueChange={(value) => setSelectedScenarioId(value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select scenario" />
                          </SelectTrigger>
                          <SelectContent>
                            {scenarios.map((scenario) => (
                              <SelectItem key={scenario.id} value={scenario.id}>
                                {scenario.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={handleCreateScenario}>
                          New
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDuplicateScenario}
                          disabled={!scenarioDraft}
                        >
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDeleteScenario}
                          disabled={scenarios.length <= 1}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-name">Name</Label>
                      <Input
                        id="scenario-name"
                        value={scenarioDraft?.name ?? ""}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev ? { ...prev, name: event.target.value } : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-description">Description</Label>
                      <Input
                        id="scenario-description"
                        value={scenarioDraft?.description ?? ""}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev ? { ...prev, description: event.target.value } : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-start">Start Date</Label>
                      <Input
                        id="scenario-start"
                        type="date"
                        value={scenarioDraft?.start_date ?? ""}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev ? { ...prev, start_date: event.target.value } : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-horizon">Horizon Years</Label>
                      <Input
                        id="scenario-horizon"
                        type="number"
                        min={1}
                        max={60}
                        value={scenarioDraft?.horizon_years ?? 10}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev ? { ...prev, horizon_years: Number(event.target.value) } : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-return">Expected Annual Return (%)</Label>
                      <Input
                        id="scenario-return"
                        type="number"
                        step="0.1"
                        value={scenarioDraft ? toPercent(scenarioDraft.expected_annual_return) : 7}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  expected_annual_return: fromPercent(Number(event.target.value)),
                                }
                              : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-volatility">Annual Volatility (%)</Label>
                      <Input
                        id="scenario-volatility"
                        type="number"
                        step="0.1"
                        value={scenarioDraft ? toPercent(scenarioDraft.annual_volatility) : 12}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  annual_volatility: fromPercent(Number(event.target.value)),
                                }
                              : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-inflation">Inflation Rate (%)</Label>
                      <Input
                        id="scenario-inflation"
                        type="number"
                        step="0.1"
                        value={scenarioDraft ? toPercent(scenarioDraft.inflation_rate) : 3}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  inflation_rate: fromPercent(Number(event.target.value)),
                                }
                              : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-contribution">Monthly Contribution</Label>
                      <Input
                        id="scenario-contribution"
                        type="number"
                        value={scenarioDraft?.monthly_contribution ?? 0}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev
                              ? { ...prev, monthly_contribution: Number(event.target.value) }
                              : prev
                          )
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Extra contribution on top of cashflow. Default 0 — cashflow already included below.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-withdrawal">Monthly Withdrawal</Label>
                      <Input
                        id="scenario-withdrawal"
                        type="number"
                        value={scenarioDraft?.monthly_withdrawal ?? 0}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev
                              ? { ...prev, monthly_withdrawal: Number(event.target.value) }
                              : prev
                          )
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Extra withdrawal on top of cashflow. Default 0.
                      </p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <div>
                        <Label htmlFor="scenario-cashflow">Include Cashflow</Label>
                        <p className="text-xs text-muted-foreground">
                          {cashflowMonthsUsed > 0
                            ? `Median net cashflow from ${cashflowMonthsUsed} months: ${formatCurrency(monthlyCashflow)}/mo`
                            : "Uses median monthly net cashflow from recent transactions."}
                        </p>
                      </div>
                      <Switch
                        id="scenario-cashflow"
                        checked={scenarioDraft?.include_cashflow ?? false}
                        onCheckedChange={(value) =>
                          setScenarioDraft((prev) =>
                            prev ? { ...prev, include_cashflow: value } : prev
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <div>
                        <Label htmlFor="scenario-default">Default Scenario</Label>
                        <p className="text-xs text-muted-foreground">
                          Make this the scenario used by default.
                        </p>
                      </div>
                      <Switch
                        id="scenario-default"
                        checked={scenarioDraft?.is_default ?? false}
                        onCheckedChange={(value) =>
                          setScenarioDraft((prev) =>
                            prev ? { ...prev, is_default: value } : prev
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleScenarioSave} disabled={isSaving || !scenarioDraft}>
                      {isSaving ? "Saving..." : "Save Scenario"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </MainContent>
          <SideContent>
            <div className="space-y-4">
              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Scenario Comparison</CardTitle>
                  <CardDescription>End value and success rate for each scenario.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {comparisonRows.length === 0 && (
                      <p className="text-sm text-muted-foreground">Add scenarios to compare outcomes.</p>
                    )}
                    {comparisonRows.map((row) => (
                      <div
                        key={row.id}
                        className={`rounded-lg border border-border/60 px-3 py-2 ${
                          row.id === selectedScenarioId ? "bg-muted/40" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{row.name}</p>
                          <span className="text-xs text-muted-foreground">
                            {row.isDefault ? "Default" : " "}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-sm font-semibold">{formatCurrency(row.endValue)}</p>
                          <span className={`text-xs font-medium ${row.successRate >= 70 ? "text-success" : row.successRate < 50 ? "text-destructive" : "text-muted-foreground"}`}>
                            {row.successRate}% success
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Event Schedule</CardTitle>
                  <CardDescription>Apply one-time changes to the forecast.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="event-date">Date</Label>
                      <Input
                        id="event-date"
                        type="date"
                        value={eventForm.event_date}
                        onChange={(event) =>
                          setEventForm((prev) => ({ ...prev, event_date: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-type">Type</Label>
                      <Select
                        value={eventForm.event_type}
                        onValueChange={(value) => setEventForm((prev) => ({ ...prev, event_type: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CONTRIBUTION">Contribution</SelectItem>
                          <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                          <SelectItem value="INCOME">Income</SelectItem>
                          <SelectItem value="EXPENSE">Expense</SelectItem>
                          <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-amount">Amount</Label>
                      <Input
                        id="event-amount"
                        type="number"
                        value={eventForm.amount}
                        onChange={(event) =>
                          setEventForm((prev) => ({ ...prev, amount: Number(event.target.value) }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-note">Note</Label>
                      <Input
                        id="event-note"
                        value={eventForm.note}
                        onChange={(event) =>
                          setEventForm((prev) => ({ ...prev, note: event.target.value }))
                        }
                      />
                    </div>
                    <Button className="w-full" onClick={handleEventSubmit}>
                      Add Event
                    </Button>
                    <div className="space-y-2">
                      {events.length === 0 && (
                        <p className="text-xs text-muted-foreground">No events scheduled.</p>
                      )}
                      {events.map((eventItem) => (
                        <div
                          key={eventItem.id}
                          className="flex items-start justify-between rounded-lg border border-border/60 px-3 py-2"
                        >
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(eventItem.event_date), "dd MMM yyyy")}
                            </p>
                            <p className="text-sm font-medium">{eventItem.event_type}</p>
                            <p className="text-sm">{formatCurrency(Number(eventItem.amount))}</p>
                            {eventItem.note && (
                              <p className="text-xs text-muted-foreground">{eventItem.note}</p>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteEvent(eventItem.id)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Insights</CardTitle>
                  <CardDescription>Signals based on the current scenario.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {insights.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </SideContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}
