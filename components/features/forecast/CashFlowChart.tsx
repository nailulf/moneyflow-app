"use client"

import { useMemo, type ReactElement } from "react"
import { BarChart, Bar, XAxis, YAxis, ReferenceLine } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/organisms/chart"
import { formatCurrency, formatCurrencyCompact } from "@/lib/data-utils"
import type { ScenarioDraft } from "@/lib/forecast/types"

const chartConfig = {
  cashflow: { label: "Annual Cash Flow", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

interface CashFlowChartProps {
  scenarioDraft: ScenarioDraft | null
  monthlyCashflow: number
  eventMap: Map<string, number>
}

type AnnualCashFlowPoint = {
  year: string
  yearIndex: number
  cashflow: number
  fill: string
}

export function CashFlowChart({
  scenarioDraft,
  monthlyCashflow,
  eventMap,
}: CashFlowChartProps): ReactElement {
  const annualData = useMemo<AnnualCashFlowPoint[]>(() => {
    if (!scenarioDraft) return []

    const baseCashflow =
      Number(scenarioDraft.monthly_contribution) -
      Number(scenarioDraft.monthly_withdrawal) +
      (scenarioDraft.include_cashflow ? monthlyCashflow : 0)

    const years = scenarioDraft.horizon_years
    const startYear = new Date(scenarioDraft.start_date).getFullYear()
    const points: AnnualCashFlowPoint[] = []

    for (let y = 0; y < years; y += 1) {
      // Annual cashflow = 12 months of base cashflow + events in that year
      let annualFlow = baseCashflow * 12
      // Sum events in this year
      for (const [monthKey, amount] of eventMap) {
        const eventYear = parseInt(monthKey.split("-")[0])
        if (eventYear === startYear + y) {
          annualFlow += amount
        }
      }

      points.push({
        year: `${startYear + y}`,
        yearIndex: y,
        cashflow: annualFlow,
        fill: annualFlow >= 0
          ? "hsl(var(--success, 142 71% 45%))"
          : "hsl(0 84% 60%)",
      })
    }
    return points
  }, [scenarioDraft, monthlyCashflow, eventMap])

  if (annualData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-sm text-muted-foreground">
        No cash flow data available
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-96 w-full">
      <BarChart data={annualData} margin={{ top: 16, right: 24, left: 8, bottom: 40 }}>
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          minTickGap={30}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <YAxis
          orientation="right"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickFormatter={(value) => formatCurrencyCompact(Number(value))}
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [formatCurrency(Number(value)), "Cash Flow"]}
            />
          }
        />
        <Bar
          dataKey="cashflow"
          radius={[4, 4, 0, 0]}
          fill="hsl(var(--chart-1))"
          // Use per-bar fill from data
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  )
}
