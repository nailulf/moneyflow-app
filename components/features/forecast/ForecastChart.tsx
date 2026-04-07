"use client"

import { useState, type ReactElement } from "react"
import { LineChart, Line, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/molecules/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/organisms/chart"
import { formatCurrency, formatCurrencyCompact } from "@/lib/data-utils"
import type { ProjectionPoint, ScenarioDraft } from "@/lib/forecast/types"
import { LIFE_EVENT_CATEGORIES, LIFE_EVENT_COLORS, type LifeEventCategory } from "@/lib/forecast/types"
import { ChartViewToggle, type ChartView } from "./ChartViewToggle"
import { CashFlowChart } from "./CashFlowChart"
import { SuccessChart } from "./SuccessChart"

const netWorthChartConfig = {
  p10: { label: "P10", color: "hsl(var(--chart-2))" },
  p25: { label: "P25", color: "hsl(var(--chart-2))" },
  p50: { label: "Median", color: "hsl(var(--chart-3))" },
  p75: { label: "P75", color: "hsl(var(--chart-4))" },
  p90: { label: "P90", color: "hsl(var(--chart-4))" },
  deterministic: { label: "Deterministic", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

const EVENT_ICON_MAP = Object.fromEntries(
  LIFE_EVENT_CATEGORIES.map((c) => [c.value, c.icon])
) as Record<string, string>

function EventDot(props: {
  cx?: number
  cy?: number
  payload?: ProjectionPoint
  index?: number
}): ReactElement {
  const { cx = 0, cy = 0, payload, index } = props
  if (!payload?.hasEvent) return <g key={index} />
  const primaryType = (payload.eventTypes[0] ?? "OTHER") as LifeEventCategory
  const color = LIFE_EVENT_COLORS[primaryType] ?? "hsl(var(--chart-1))"
  const iconPath = EVENT_ICON_MAP[primaryType] ?? EVENT_ICON_MAP.OTHER
  const r = 13
  const iconAreaSize = r * 2 - 10
  const iconScale = iconAreaSize / 24

  return (
    <g key={index}>
      <line x1={cx} y1={cy + r + 2} x2={cx} y2={cy + r + 20} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="3 2" />
      <circle cx={cx} cy={cy} r={r} fill="hsl(var(--background))" stroke={color} strokeWidth={1.5} />
      <g transform={`translate(${cx - iconAreaSize / 2}, ${cy - iconAreaSize / 2}) scale(${iconScale})`}>
        <path d={iconPath} fill="none" stroke={color} strokeWidth={2.5 / iconScale} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  )
}

interface ForecastChartProps {
  projection: ProjectionPoint[] | null
  isLoading: boolean
  scenarioDraft: ScenarioDraft | null
  monthlyCashflow: number
  eventMap: Map<string, number>
  successRate: number | null
}

export function ForecastChart({
  projection,
  isLoading,
  scenarioDraft,
  monthlyCashflow,
  eventMap,
  successRate,
}: ForecastChartProps): ReactElement {
  const [chartView, setChartView] = useState<ChartView>("net-worth")

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Scenario Projection</CardTitle>
            <CardDescription>
              {chartView === "net-worth" && "Monte Carlo range (500 paths) plus deterministic baseline."}
              {chartView === "cash-flow" && "Annual projected cash flow by year."}
              {chartView === "success" && "Probability distribution of outcomes across 500 simulated paths."}
            </CardDescription>
          </div>
          <ChartViewToggle value={chartView} onChange={setChartView} />
        </div>
      </CardHeader>
      <CardContent>
        {chartView === "net-worth" && (
          projection ? (
            <ChartContainer config={netWorthChartConfig} className="h-96 w-full">
              <LineChart data={projection} margin={{ top: 16, right: 24, left: 8, bottom: 40 }}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={40} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis orientation="right" tickLine={false} axisLine={false} minTickGap={40} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(value) => formatCurrencyCompact(Number(value))} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [formatCurrency(Number(value)), name]} />} />
                <Line type="monotone" dataKey="p90" stroke="var(--color-p90)" strokeWidth={1} dot={false} strokeDasharray="4 3" opacity={0.35} />
                <Line type="monotone" dataKey="p10" stroke="var(--color-p10)" strokeWidth={1} dot={false} strokeDasharray="4 3" opacity={0.35} />
                <Line type="monotone" dataKey="p75" stroke="var(--color-p75)" strokeWidth={1.2} dot={false} strokeDasharray="5 3" opacity={0.5} />
                <Line type="monotone" dataKey="p25" stroke="var(--color-p25)" strokeWidth={1.2} dot={false} strokeDasharray="5 3" opacity={0.5} />
                <Line type="monotone" dataKey="p50" stroke="var(--color-p50)" strokeWidth={1.5} dot={false} strokeDasharray="6 3" opacity={0.75} />
                <Line type="monotone" dataKey="deterministic" stroke="var(--color-deterministic)" strokeWidth={2.5} dot={<EventDot />} activeDot={{ r: 5 }} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
              {isLoading ? "Loading scenarios..." : "No projection available"}
            </div>
          )
        )}
        {chartView === "cash-flow" && (
          <CashFlowChart
            scenarioDraft={scenarioDraft}
            monthlyCashflow={monthlyCashflow}
            eventMap={eventMap}
          />
        )}
        {chartView === "success" && (
          <SuccessChart
            projection={projection}
            successRate={successRate}
            targetNetWorth={scenarioDraft?.target_net_worth ?? 0}
          />
        )}
      </CardContent>
    </Card>
  )
}
