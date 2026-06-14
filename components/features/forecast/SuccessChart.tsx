"use client"

import type { ReactElement } from "react"
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Line } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/organisms/chart"
import { formatCurrency, formatCurrencyCompact } from "@/lib/data-utils"
import type { ProjectionPoint } from "@/lib/forecast/types"

const chartConfig = {
  p10: { label: "P10", color: "hsl(var(--chart-2))" },
  p25: { label: "P25", color: "hsl(var(--chart-3))" },
  p50: { label: "Median", color: "hsl(var(--chart-1))" },
  p75: { label: "P75", color: "hsl(var(--chart-3))" },
  p90: { label: "P90", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

interface SuccessChartProps {
  projection: ProjectionPoint[] | null
  successRate: number | null
  targetNetWorth: number
}

export function SuccessChart({
  projection,
  successRate,
  targetNetWorth,
}: SuccessChartProps): ReactElement {
  if (!projection) {
    return (
      <div className="h-96 flex items-center justify-center text-sm text-muted-foreground">
        No projection data available
      </div>
    )
  }

  return (
    <div>
      {successRate !== null && (
        <div className="text-center mb-4">
          <p className="text-3xl font-bold">{successRate}%</p>
          <p className="text-sm text-muted-foreground">
            chance of ending {targetNetWorth > 0 ? `above ${formatCurrency(targetNetWorth)}` : "positive"}
          </p>
        </div>
      )}
      <ChartContainer config={chartConfig} className="h-80 w-full">
        <AreaChart data={projection} margin={{ top: 16, right: 24, left: 8, bottom: 40 }}>
          <defs>
            <linearGradient id="outerBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15} />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="innerBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1} />
            </linearGradient>
          </defs>
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
          {targetNetWorth > 0 && (
            <ReferenceLine
              y={targetNetWorth}
              stroke="hsl(var(--destructive))"
              strokeDasharray="6 3"
              label={{ value: "Target", position: "left", fill: "hsl(var(--destructive))", fontSize: 11 }}
            />
          )}
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => [formatCurrency(Number(value)), name]}
              />
            }
          />
          {/* Outer band P10-P90 */}
          <Area type="monotone" dataKey="p90" stroke="none" fill="url(#outerBand)" />
          <Area type="monotone" dataKey="p10" stroke="none" fill="url(#outerBand)" />
          {/* Inner band P25-P75 */}
          <Area type="monotone" dataKey="p75" stroke="none" fill="url(#innerBand)" />
          <Area type="monotone" dataKey="p25" stroke="none" fill="url(#innerBand)" />
          {/* Median dashed line */}
          <Line
            type="monotone"
            dataKey="p50"
            stroke="var(--color-p50)"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
