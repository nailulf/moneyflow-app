"use client"

import { useMemo, type ReactElement } from "react"
import { useTranslations } from "next-intl"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, ReferenceLine, Line,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/organisms/chart"
import { formatCurrency, formatCurrencyCompact } from "@/lib/data-utils"
import type { ProjectionPoint, ScenarioDraft, ForecastEvent, EventDetail } from "@/lib/forecast/types"
import { LIFE_EVENT_CATEGORIES, LIFE_EVENT_COLORS, type LifeEventCategory } from "@/lib/forecast/types"
import { buildEventAnnualImpacts } from "@/lib/forecast/event-impact"

// --- Shared event marker helpers ---

const EVENT_ICON_MAP = Object.fromEntries(
  LIFE_EVENT_CATEGORIES.map((c) => [c.value, c.icon])
) as Record<string, string>

function useCategoryLabel(): (type: string) => string {
  const tCat = useTranslations("forecast.categories")
  return (type: string) => {
    if (LIFE_EVENT_CATEGORIES.some((c) => c.value === type)) {
      return tCat(`${type}.label`)
    }
    return type
  }
}

// Shared event section rendered inside tooltips when the hovered point has events
function EventTooltipSection({ details }: { details: EventDetail[] }): ReactElement {
  const t = useTranslations("forecast.chart")
  const getCategoryLabel = useCategoryLabel()
  if (details.length === 0) return <></>
  return (
    <div className="border-t border-border/50 mt-2 pt-2 space-y-1">
      {details.map((d, i) => {
        const color = LIFE_EVENT_COLORS[d.type as LifeEventCategory] ?? "hsl(var(--muted-foreground))"
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-muted-foreground">{getCategoryLabel(d.type)}</span>
            <span className="text-xs font-medium ml-auto">{d.name}</span>
          </div>
        )
      })}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t("eventCost")}</span>
        <span className="font-medium text-destructive">
          {formatCurrency(details.reduce((s, d) => s + d.amount, 0))}
        </span>
      </div>
    </div>
  )
}

// Custom tooltip for Net Worth chart
function NetWorthTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: ProjectionPoint; value: number }>
}): ReactElement | null {
  const t = useTranslations("forecast.chart")
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2.5 shadow-xl min-w-[180px]">
      <p className="text-xs font-medium text-foreground">{point.ageLabel}</p>
      <p className="text-xs text-muted-foreground mb-1.5">{point.date}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">{t("netWorth")}</span>
        <span className="text-xs font-semibold tabular-nums">{formatCurrency(point.deterministic)}</span>
      </div>
      <EventTooltipSection details={point.eventDetails} />
    </div>
  )
}

// Custom tooltip for Simulation chart — shows ranges instead of raw percentile names
function SimulationTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: ProjectionPoint; value: number }>
}): ReactElement | null {
  const t = useTranslations("forecast.chart")
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const rows: { label: string; value: string }[] = [
    { label: t("topRange"), value: `${formatCurrencyCompact(point.p75)} – ${formatCurrencyCompact(point.p90)}` },
    { label: t("midRange"), value: `${formatCurrencyCompact(point.p25)} – ${formatCurrencyCompact(point.p75)}` },
    { label: t("median"), value: formatCurrency(point.p50) },
    { label: t("bottomRange"), value: `${formatCurrencyCompact(point.p10)} – ${formatCurrencyCompact(point.p25)}` },
  ]
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2.5 shadow-xl min-w-[200px]">
      <p className="text-xs font-medium text-foreground">{point.ageLabel}</p>
      <p className="text-xs text-muted-foreground mb-1.5">{point.date}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className="text-xs font-semibold tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
      <EventTooltipSection details={point.eventDetails} />
    </div>
  )
}

// Custom tooltip for Cash Flow bar chart — shows income, expense, and event breakdown
function CashFlowTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: AnnualCashFlowPoint; value: number; name: string }>
}): ReactElement | null {
  const t = useTranslations("forecast.chart")
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2.5 shadow-xl min-w-[200px]">
      <p className="text-xs font-medium text-foreground">{point.ageLabel}</p>
      <p className="text-xs text-muted-foreground mb-1.5">{point.year}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--success, 142 71% 45%))" }} />
            <span className="text-xs text-muted-foreground">{t("income")}</span>
          </div>
          <span className="text-xs font-semibold tabular-nums">{formatCurrency(point.income)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(0 84% 60%)" }} />
            <span className="text-xs text-muted-foreground">{t("expense")}</span>
          </div>
          <span className="text-xs font-semibold tabular-nums">{formatCurrency(Math.abs(point.expense))}</span>
        </div>
      </div>
      {point.eventItems.length > 0 && (
        <div className="border-t border-border/50 mt-2 pt-2 space-y-1">
          {point.eventItems.map((ev, i) => {
            const color = LIFE_EVENT_COLORS[ev.type as LifeEventCategory] ?? "hsl(var(--muted-foreground))"
            return (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs">{ev.name}</span>
                </div>
                <span className={`text-xs font-medium tabular-nums ${ev.isIncome ? "text-success" : "text-destructive"}`}>
                  {ev.isIncome ? "+" : "-"}{formatCurrency(ev.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Event legend strip below a chart — simple labels, no separate tooltip (tooltip is on the chart)
function EventStrip({ events }: { events: ForecastEvent[] }): ReactElement {
  if (events.length === 0) return <></>
  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40">
      {events.map((event) => {
        const type = event.event_type as LifeEventCategory
        const color = LIFE_EVENT_COLORS[type] ?? "hsl(var(--muted-foreground))"
        const iconPath = EVENT_ICON_MAP[type] ?? EVENT_ICON_MAP.OTHER
        return (
          <div
            key={event.id}
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1"
            style={{ borderColor: color }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d={iconPath} />
            </svg>
            <span className="text-xs font-medium">{event.name}</span>
          </div>
        )
      })}
    </div>
  )
}

// Custom dot rendered on the deterministic line at event points
// Renders one icon circle centered at (cx, cy)
function EventIcon({ cx, cy, type }: { cx: number; cy: number; type: string }): ReactElement {
  const color = LIFE_EVENT_COLORS[type as LifeEventCategory] ?? "hsl(var(--muted-foreground))"
  const iconPath = EVENT_ICON_MAP[type] ?? EVENT_ICON_MAP.OTHER
  const r = 12
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="hsl(var(--background))" stroke={color} strokeWidth={1.5} />
      <svg x={cx - 8} y={cy - 8} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={iconPath} />
      </svg>
    </g>
  )
}

// Custom dot that renders all event icons stacked vertically below the data point
// Icons are connected by a vertical line with 8px gaps between each icon
function EventDot(props: {
  cx?: number
  cy?: number
  payload?: ProjectionPoint
  index?: number
}): ReactElement {
  const { cx = 0, cy = 0, payload, index } = props
  if (!payload?.hasEvent || payload.eventTypes.length === 0) return <g key={index} />

  const types = payload.eventTypes
  const r = 12
  const diameter = r * 2
  const gap = 8

  // First icon starts below the data point with a gap
  const firstIconY = cy + r + gap
  // Each subsequent icon: diameter + gap below previous center
  const getIconY = (i: number) => firstIconY + i * (diameter + gap)
  const lastIconY = getIconY(types.length - 1)

  return (
    <g key={index}>
      {/* Small dot on the actual data point */}
      <circle cx={cx} cy={cy} r={3} fill="hsl(var(--chart-1))" />

      {/* Vertical dashed line from data point to bottom of last icon */}
      <line
        x1={cx} y1={cy + 3} x2={cx} y2={lastIconY + r}
        stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="3 2"
      />

      {/* Stack icons below the line point */}
      {types.map((type, i) => (
        <EventIcon key={i} cx={cx} cy={getIconY(i)} type={type} />
      ))}
    </g>
  )
}

// Renders event markers as vertical reference lines with icon labels at the top
function EventReferenceLines({ events, xKey }: { events: ForecastEvent[]; xKey: string }): ReactElement {
  const getCategoryLabel = useCategoryLabel()
  // Group events by year for bar charts (xKey = ageLabel matching the bar data)
  return (
    <>
      {events.map((event) => {
        const eventYear = new Date(event.event_date).getFullYear()
        const primaryType = event.event_type as LifeEventCategory
        const color = LIFE_EVENT_COLORS[primaryType] ?? "hsl(var(--muted-foreground))"
        return (
          <ReferenceLine
            key={event.id}
            x={xKey === "year" ? eventYear : undefined}
            stroke={color}
            strokeDasharray="4 3"
            strokeWidth={1}
            opacity={0.6}
            label={{
              value: getCategoryLabel(event.event_type),
              position: "top",
              fill: color,
              fontSize: 9,
            }}
          />
        )
      })}
    </>
  )
}

// Downsample monthly projection to ~yearly points for smooth chart rendering.
// Always keeps the first point, last point, and any point with events.
function downsampleProjection(points: ProjectionPoint[]): ProjectionPoint[] {
  if (points.length <= 60) return points // Already small enough
  const result: ProjectionPoint[] = []
  const interval = 12 // one point per year
  for (let i = 0; i < points.length; i++) {
    const isFirst = i === 0
    const isLast = i === points.length - 1
    const isYearly = i % interval === 0
    const hasEvent = points[i].hasEvent
    if (isFirst || isLast || isYearly || hasEvent) {
      result.push(points[i])
    }
  }
  return result
}

// --- Chart configs ---

const netWorthConfig = {
  deterministic: { label: "Net Worth", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

const cashFlowConfig = {
  income: { label: "Income", color: "hsl(var(--success, 142 71% 45%))" },
  expense: { label: "Expense", color: "hsl(0 84% 60%)" },
} satisfies ChartConfig

const simulationConfig = {
  p10: { label: "P10", color: "hsl(var(--chart-1))" },
  p25: { label: "P25", color: "hsl(var(--chart-1))" },
  p50: { label: "Median", color: "hsl(var(--chart-1))" },
  p75: { label: "P75", color: "hsl(var(--chart-1))" },
  p90: { label: "P90", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

// --- Net Worth View ---

interface NetWorthViewProps {
  projection: ProjectionPoint[]
  netWorth: number
  events: ForecastEvent[]
}

function NetWorthView({ projection, netWorth, events }: NetWorthViewProps): ReactElement {
  const t = useTranslations("forecast.chart")
  const chartData = useMemo(() => downsampleProjection(projection), [projection])
  const finalPoint = projection[projection.length - 1]
  const delta = finalPoint.deterministic - netWorth
  const deltaPercent = netWorth !== 0 ? Math.round((delta / netWorth) * 100) : 0

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("currentNetWorth")}</p>
          <p className="text-2xl font-bold">{formatCurrency(netWorth)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {t("futureNetWorthAt", { age: finalPoint.ageLabel.toLowerCase().replace("age ", "") })}
          </p>
          <p className="text-2xl font-bold">{formatCurrency(finalPoint.deterministic)}</p>
          <p className={`text-sm ${delta >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(delta)} ({deltaPercent.toLocaleString()}%)
          </p>
        </div>
      </div>

      <ChartContainer config={netWorthConfig} className="h-80 w-full overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible">
        <AreaChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 24 }}>
          <defs>
            <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="ageLabel" tickLine={false} axisLine={false} minTickGap={50}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <YAxis
            orientation="right" tickLine={false} axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickFormatter={(v) => formatCurrencyCompact(Number(v))}
          />
          <ChartTooltip content={<NetWorthTooltip />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 50, pointerEvents: "none" }} />
          <Area
            type="monotone" dataKey="deterministic"
            stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="2 2"
            fill="url(#nwGradient)"
            dot={<EventDot />}
            activeDot={{ r: 4, fill: "hsl(var(--chart-1))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
          />
        </AreaChart>
      </ChartContainer>
      <EventStrip events={events} />
    </div>
  )
}

// --- Cash Flow View ---

type CashFlowEventItem = {
  name: string
  type: string
  amount: number
  isIncome: boolean
}

type AnnualCashFlowPoint = {
  ageLabel: string
  year: number
  income: number
  expense: number
  hasRetirement: boolean
  eventItems: CashFlowEventItem[]
}

interface CashFlowViewProps {
  scenarioDraft: ScenarioDraft
  baseAnnualIncome: number
  baseAnnualExpenses: number
  monthlyCashflow: number
  events: ForecastEvent[]
}

function CashFlowView({ scenarioDraft, baseAnnualIncome, baseAnnualExpenses, monthlyCashflow, events }: CashFlowViewProps): ReactElement {
  const t = useTranslations("forecast.chart")
  const inflationRate = scenarioDraft.inflation_rate

  const annualData = useMemo<AnnualCashFlowPoint[]>(() => {
    const years = scenarioDraft.horizon_years
    const startYear = new Date(scenarioDraft.start_date).getFullYear()
    const points: AnnualCashFlowPoint[] = []

    // Build baseline annual income and expenses from all available sources
    const scenarioContribution = Number(scenarioDraft.monthly_contribution) * 12
    const scenarioWithdrawal = Number(scenarioDraft.monthly_withdrawal) * 12

    let yearOneIncome = baseAnnualIncome + scenarioContribution
    let yearOneExpense = baseAnnualExpenses + scenarioWithdrawal

    // Fallback: derive from net monthly cashflow if no breakdown
    if (yearOneIncome === 0 && yearOneExpense === 0 && scenarioDraft.include_cashflow && monthlyCashflow !== 0) {
      const annualNet = monthlyCashflow * 12
      yearOneIncome = Math.max(0, annualNet)
      yearOneExpense = Math.max(0, -annualNet)
    }

    // Compute multi-year event impacts using the new engine
    const eventImpacts = buildEventAnnualImpacts(events, startYear, years, inflationRate)

    // Find retirement year — active income (salary) stops after this year
    const retirementEvent = events.find((e) => e.event_type === "RETIREMENT" && e.is_enabled !== false)
    const retirementYear = retirementEvent ? new Date(retirementEvent.event_date).getFullYear() : null

    for (let y = 0; y < years; y += 1) {
      const currentYear = startYear + y
      const inflationFactor = Math.pow(1 + inflationRate, y)

      // Baseline income (salary) grows with inflation, but stops at retirement
      let yearIncome = 0
      if (!retirementYear || currentYear < retirementYear) {
        yearIncome = yearOneIncome * inflationFactor
      }

      // Expenses continue growing with inflation even after retirement
      let yearExpense = yearOneExpense * inflationFactor

      // Add multi-year event impacts (mortgage payments, recurring costs, etc.)
      const impact = eventImpacts.get(currentYear)
      if (impact) {
        yearIncome += impact.income
        yearExpense += impact.expense
      }

      const hasRetirement = retirementYear === currentYear
      const eventItems: CashFlowEventItem[] = impact?.items ?? []

      points.push({
        ageLabel: y === 0 ? t("today") : t("yearN", { n: y + 1 }),
        year: currentYear,
        income: yearIncome,
        expense: -yearExpense,
        hasRetirement,
        eventItems,
      })
    }
    return points
  }, [scenarioDraft, baseAnnualIncome, baseAnnualExpenses, monthlyCashflow, events, inflationRate, t])

  const retirementIndex = annualData.findIndex((d) => d.hasRetirement)
  const preRetire = retirementIndex >= 0 ? annualData.slice(0, retirementIndex) : annualData
  const postRetire = retirementIndex >= 0 ? annualData.slice(retirementIndex) : []
  const preRetireNet = preRetire.length > 0
    ? preRetire.reduce((s, d) => s + d.income + d.expense, 0) / preRetire.length : 0
  const postRetireNet = postRetire.length > 0
    ? postRetire.reduce((s, d) => s + d.income + d.expense, 0) / postRetire.length : 0

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-muted-foreground">{retirementIndex >= 0 ? t("preRetire") : t("average")}</p>
          <p className="text-2xl font-bold">{t("avgPerYear", { amount: formatCurrency(Math.abs(preRetireNet)) })}</p>
        </div>
        {retirementIndex >= 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t("postRetire")}</p>
            <p className="text-2xl font-bold">{t("avgPerYear", { amount: formatCurrency(postRetireNet) })}</p>
            <p className="text-sm text-destructive">
              {formatCurrency(postRetireNet - preRetireNet)} ({Math.round(((postRetireNet - preRetireNet) / Math.abs(preRetireNet || 1)) * 100)}%)
            </p>
          </div>
        )}
      </div>

      <ChartContainer config={cashFlowConfig} className="h-80 w-full overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible">
        <BarChart data={annualData} margin={{ top: 20, right: 16, left: 0, bottom: 24 }} stackOffset="sign">
          <XAxis
            dataKey="ageLabel" tickLine={false} axisLine={false} minTickGap={40}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <YAxis
            orientation="right" tickLine={false} axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickFormatter={(v) => formatCurrencyCompact(Number(v))}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
          {retirementIndex >= 0 && (
            <ReferenceLine
              x={annualData[retirementIndex]?.ageLabel}
              stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3"
            />
          )}
          <ChartTooltip content={<CashFlowTooltip />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 50, pointerEvents: "none" }} />
          <Bar dataKey="income" stackId="cashflow" radius={[4, 4, 0, 0]} fill="var(--color-income)" />
          <Bar dataKey="expense" stackId="cashflow" radius={[0, 0, 4, 4]} fill="var(--color-expense)" />
        </BarChart>
      </ChartContainer>
      <EventStrip events={events} />
    </div>
  )
}

// --- Simulation View ---

interface SimulationViewProps {
  projection: ProjectionPoint[]
  successRate: number | null
  targetNetWorth: number
  scenarioDraft: ScenarioDraft
  events: ForecastEvent[]
}

function SimulationView({ projection, successRate, targetNetWorth, scenarioDraft, events }: SimulationViewProps): ReactElement {
  const t = useTranslations("forecast.chart")
  const chartData = useMemo(() => downsampleProjection(projection), [projection])
  const finalPoint = projection[projection.length - 1]
  const horizonAge = finalPoint.ageLabel
  const realReturn = ((scenarioDraft.expected_annual_return - scenarioDraft.inflation_rate) * 100).toFixed(2)
  const rate = successRate ?? 0

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("chanceOfSuccess")}</p>
          <p className="text-2xl font-bold">{rate}%</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {rate >= 50
              ? t("successDescriptionHigh", { rate })
              : t("successDescriptionLow", { rate })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {t("medianNetWorthAt", { age: horizonAge.toLowerCase().replace("age ", "") })}
          </p>
          <p className="text-2xl font-bold">{formatCurrency(finalPoint.p50)}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t("medianDescription", { amount: formatCurrency(finalPoint.p50) })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("avgProjectedReturn")}</p>
          <p className="text-2xl font-bold">{realReturn}%</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t("returnDescription", { rate: realReturn, years: scenarioDraft.horizon_years })}
          </p>
        </div>
      </div>

      <ChartContainer config={simulationConfig} className="h-80 w-full overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible">
        <AreaChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 24 }}>
          <defs>
            <linearGradient id="outerBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.12} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="innerBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="ageLabel" tickLine={false} axisLine={false} minTickGap={50}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <YAxis
            orientation="right" tickLine={false} axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickFormatter={(v) => formatCurrencyCompact(Number(v))}
          />
          {targetNetWorth > 0 && (
            <ReferenceLine y={targetNetWorth} stroke="hsl(var(--destructive))" strokeDasharray="6 3" />
          )}
          <ChartTooltip content={<SimulationTooltip />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 50, pointerEvents: "none" }} />
          <Area type="monotone" dataKey="p90" stroke="none" fill="url(#outerBand)" />
          <Area type="monotone" dataKey="p10" stroke="none" fill="url(#outerBand)" />
          <Area type="monotone" dataKey="p75" stroke="none" fill="url(#innerBand)" />
          <Area type="monotone" dataKey="p25" stroke="none" fill="url(#innerBand)" />
          <Line
            type="monotone" dataKey="p50"
            stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="2 2"
            dot={<EventDot />}
            activeDot={{ r: 4, fill: "hsl(var(--chart-1))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
          />
        </AreaChart>
      </ChartContainer>
      <EventStrip events={events} />
    </div>
  )
}

// --- Main ForecastChart (exported) ---

export type ForecastChartView = "net-worth" | "cash-flow" | "simulation"

interface ForecastChartProps {
  view: ForecastChartView
  projection: ProjectionPoint[] | null
  isLoading: boolean
  netWorth: number | null
  scenarioDraft: ScenarioDraft | null
  monthlyCashflow: number
  baseAnnualIncome: number
  baseAnnualExpenses: number
  events: ForecastEvent[]
  successRate: number | null
}

export function ForecastChart({
  view,
  projection,
  isLoading,
  netWorth,
  scenarioDraft,
  monthlyCashflow,
  baseAnnualIncome,
  baseAnnualExpenses,
  events,
  successRate,
}: ForecastChartProps): ReactElement {
  const t = useTranslations("forecast.chart")
  if (isLoading || !projection || !scenarioDraft || netWorth === null) {
    return (
      <div className="h-96 flex items-center justify-center text-sm text-muted-foreground">
        {isLoading ? t("computing") : t("noProjection")}
      </div>
    )
  }

  if (view === "net-worth") {
    return <NetWorthView projection={projection} netWorth={netWorth} events={events} />
  }
  if (view === "cash-flow") {
    return <CashFlowView scenarioDraft={scenarioDraft} baseAnnualIncome={baseAnnualIncome} baseAnnualExpenses={baseAnnualExpenses} monthlyCashflow={monthlyCashflow} events={events} />
  }
  return (
    <SimulationView
      projection={projection}
      successRate={successRate}
      targetNetWorth={scenarioDraft.target_net_worth}
      scenarioDraft={scenarioDraft}
      events={events}
    />
  )
}
