"use client"

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react"
import { format, addMonths } from "date-fns"
import { LineChart, Line, XAxis, Tooltip } from "recharts"
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
import { formatCurrency } from "@/lib/data-utils"
import type { Database } from "@/types/database"

type ForecastScenario = Database["public"]["Tables"]["wealth_forecast_scenarios"]["Row"]
type ForecastEvent = Database["public"]["Tables"]["wealth_forecast_events"]["Row"]

type NetWorthResponse = {
  currentNetWorth: number
}

type MonthlyCashflowResponse = {
  summary: {
    averageNetCashFlow: number
  }
}

type ProjectionPoint = {
  date: string
  p10: number
  p50: number
  p90: number
  deterministic: number
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
  p50: {
    label: "P50",
    color: "hsl(var(--chart-3))",
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

const defaultScenarioPayload = {
  name: "Base Scenario",
  description: "Default forecast",
  start_date: new Date().toISOString().split("T")[0],
  horizon_years: 10,
  expected_annual_return: 0.07,
  annual_volatility: 0.12,
  inflation_rate: 0.03,
  monthly_contribution: 0,
  monthly_withdrawal: 0,
  include_cashflow: true,
  is_default: true,
}

const toPercent = (value: number): number => Number((value * 100).toFixed(2))
const fromPercent = (value: number): number => value / 100

const getMonthKey = (date: Date): string => format(date, "yyyy-MM")

const calculateMonthlyRate = (annualRate: number): number =>
  Math.pow(1 + annualRate, 1 / 12) - 1

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

export default function PortfolioForecastPage(): ReactElement {
  const { user } = useAuth()
  const [scenarios, setScenarios] = useState<ForecastScenario[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft | null>(null)
  const [events, setEvents] = useState<ForecastEvent[]>([])
  const [netWorth, setNetWorth] = useState<number | null>(null)
  const [monthlyCashflow, setMonthlyCashflow] = useState<number>(0)
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
    const response = await fetch("/api/transactions/monthly?months=12", { cache: "no-store" })
    if (!response.ok) return
    const data = (await response.json()) as MonthlyCashflowResponse
    setMonthlyCashflow(data.summary.averageNetCashFlow ?? 0)
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
    const simulations = 200
    const series: number[][] = Array.from({ length: months + 1 }, () => [])
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
    const points: ProjectionPoint[] = []
    for (let i = 0; i <= months; i += 1) {
      const dateLabel = format(addMonths(baseDate, i), "MMM yyyy")
      const values = series[i]
      points.push({
        date: dateLabel,
        p10: percentile(values, 0.1),
        p50: percentile(values, 0.5),
        p90: percentile(values, 0.9),
        deterministic: deterministicSeries[i],
      })
    }
    return points
  }, [scenarioDraft, netWorth, monthlyCashflow, eventMap])

  const comparisonRows = useMemo(() => {
    if (netWorth === null) return []
    return scenarios.map((scenario) => {
      const months = Math.max(1, scenario.horizon_years * 12)
      const baseDate = new Date(scenario.start_date)
      const meanMonthly = calculateRealMonthlyRate(
        Number(scenario.expected_annual_return),
        Number(scenario.inflation_rate)
      )
      const baseCashflow =
        Number(scenario.monthly_contribution) -
        Number(scenario.monthly_withdrawal) +
        (scenario.include_cashflow ? monthlyCashflow : 0)
      let value = netWorth
      for (let i = 1; i <= months; i += 1) {
        const monthDate = addMonths(baseDate, i)
        const eventAdjustment = scenario.id === selectedScenarioId
          ? eventMap.get(getMonthKey(monthDate)) ?? 0
          : 0
        value = value * (1 + meanMonthly) + baseCashflow + eventAdjustment
      }
      return {
        id: scenario.id,
        name: scenario.name,
        endValue: value,
        isDefault: scenario.is_default,
      }
    })
  }, [scenarios, netWorth, monthlyCashflow, eventMap, selectedScenarioId])

  const insights = useMemo(() => {
    if (!projection || !scenarioDraft || netWorth === null) return []
    const finalPoint = projection[projection.length - 1]
    const notes: string[] = []
    if (finalPoint.p50 < netWorth) {
      notes.push("Projected median wealth ends below today. Consider increasing contributions or reducing withdrawals.")
    }
    if (scenarioDraft.include_cashflow && monthlyCashflow < 0) {
      notes.push("Negative average cashflow drags the forecast. Improve cashflow or disable cashflow inclusion.")
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
  }, [projection, scenarioDraft, netWorth, monthlyCashflow])

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
                  <p className="text-xs text-muted-foreground">Upside (P90)</p>
                  <p className="text-lg font-semibold text-success">
                    {projection ? formatCurrency(projection[projection.length - 1].p90) : "—"}
                  </p>
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
                    Monte Carlo range plus deterministic baseline for the selected scenario.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projection ? (
                    <ChartContainer config={chartConfig} className="h-80 w-full">
                      <LineChart data={projection} margin={{ top: 12, right: 16, left: 8, bottom: 0 }}>
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          minTickGap={32}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => [formatCurrency(Number(value)), name]}
                            />
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="deterministic"
                          stroke="var(--color-deterministic)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="p90"
                          stroke="var(--color-p90)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="p50"
                          stroke="var(--color-p50)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="p10"
                          stroke="var(--color-p10)"
                          strokeWidth={2}
                          dot={false}
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
                    <div className="space-y-2">
                      <Label htmlFor="scenario-select">Scenario</Label>
                      <Select
                        value={selectedScenarioId ?? undefined}
                        onValueChange={(value) => setSelectedScenarioId(value)}
                      >
                        <SelectTrigger className="w-full">
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
                        type="amount"
                        value={scenarioDraft?.monthly_contribution ?? 0}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev
                              ? { ...prev, monthly_contribution: Number(event.target.value) }
                              : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scenario-withdrawal">Monthly Withdrawal</Label>
                      <Input
                        id="scenario-withdrawal"
                        type="amount"
                        value={scenarioDraft?.monthly_withdrawal ?? 0}
                        onChange={(event) =>
                          setScenarioDraft((prev) =>
                            prev
                              ? { ...prev, monthly_withdrawal: Number(event.target.value) }
                              : prev
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <div>
                        <Label htmlFor="scenario-cashflow">Include Cashflow</Label>
                        <p className="text-xs text-muted-foreground">
                          Uses average monthly net cashflow from recent transactions.
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
                  <CardDescription>Expected end value for each scenario.</CardDescription>
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
                        <p className="text-sm font-semibold">{formatCurrency(row.endValue)}</p>
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
                        type="amount"
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
                        <div key={eventItem.id} className="rounded-lg border border-border/60 px-3 py-2">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(eventItem.event_date), "dd MMM yyyy")}
                          </p>
                          <p className="text-sm font-medium">{eventItem.event_type}</p>
                          <p className="text-sm">{formatCurrency(Number(eventItem.amount))}</p>
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
