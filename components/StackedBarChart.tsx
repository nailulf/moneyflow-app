"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/molecules/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/organisms/chart"

export const description = "A stacked bar chart with legend and modern styling"

// Sample data for stacked bar chart (e.g., revenue breakdown by category)
const defaultChartData = [
  { month: "January", revenue: 45000, expenses: 32000, profit: 13000 },
  { month: "February", revenue: 52000, expenses: 35000, profit: 17000 },
  { month: "March", revenue: 48000, expenses: 33000, profit: 15000 },
  { month: "April", revenue: 61000, expenses: 38000, profit: 23000 },
  { month: "May", revenue: 55000, expenses: 36000, profit: 19000 },
  { month: "June", revenue: 58000, expenses: 37000, profit: 21000 },
  { month: "July", revenue: 63000, expenses: 39000, profit: 24000 },
  { month: "August", revenue: 59000, expenses: 38000, profit: 21000 },
  { month: "September", revenue: 67000, expenses: 41000, profit: 26000 },
  { month: "October", revenue: 64000, expenses: 40000, profit: 24000 },
  { month: "November", revenue: 71000, expenses: 43000, profit: 28000 },
  { month: "December", revenue: 75000, expenses: 45000, profit: 30000 },
]

const defaultChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

interface StackedBarChartProps {
  data?: Array<Record<string, string | number>>
  config?: ChartConfig
  title?: string
  description?: string
  className?: string
  showTrend?: boolean
  trendValue?: number
  trendLabel?: string
  tooltipFormatter?: (value: number, name: string, props: Record<string, unknown>) => [string, string] | React.ReactNode
}

export function StackedBarChart({
  data = defaultChartData,
  config = defaultChartConfig,
  title = "Financial Overview",
  description = "January - December 2024",
  className,
  showTrend = true,
  trendValue = 8.7,
  trendLabel = "Trending up by 8.7% this year",
  tooltipFormatter,
}: StackedBarChartProps) {
  const totalValue = React.useMemo(() => {
    return data.reduce((acc, curr) => {
      const revenue = typeof curr.revenue === 'number' ? curr.revenue : 0;
      const expenses = typeof curr.expenses === 'number' ? curr.expenses : 0;
      const profit = typeof curr.profit === 'number' ? curr.profit : 0;
      return acc + revenue + expenses + profit;
    }, 0);
  }, [data]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[300px]">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent 
                  hideLabel 
                  formatter={tooltipFormatter as any}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {/* Dynamically render bars based on config */}
            {Object.keys(config).map((key, index, array) => {
              // Determine if this is the first or last bar for radius styling
              const isFirst = index === 0;
              const isLast = index === array.length - 1;
              
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={config[key].color}
                  radius={[
                    isLast ? 4 : 0,  // top-left radius
                    isLast ? 4 : 0,  // top-right radius
                    isFirst ? 4 : 0, // bottom-right radius
                    isFirst ? 4 : 0  // bottom-left radius
                  ]}
                />
              );
            })}
          </BarChart>
        </ChartContainer>
        {showTrend && (
          <div className="flex w-full items-start gap-2 text-sm">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 font-medium leading-none">
                {trendLabel} <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                Showing total financial performance for the last 6 months
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Export additional utility functions for financial calculations
export const financialUtils = {
  calculateTotalRevenue: (data: Array<{ revenue: number }>) => 
    data.reduce((acc, curr) => acc + curr.revenue, 0),
  
  calculateTotalExpenses: (data: Array<{ expenses: number }>) => 
    data.reduce((acc, curr) => acc + curr.expenses, 0),
  
  calculateTotalProfit: (data: Array<{ profit: number }>) => 
    data.reduce((acc, curr) => acc + curr.profit, 0),
  
  calculateProfitMargin: (data: Array<{ revenue: number; profit: number }>) => {
    const totalRevenue = data.reduce((acc, curr) => acc + curr.revenue, 0)
    const totalProfit = data.reduce((acc, curr) => acc + curr.profit, 0)
    return totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  },
}

export default StackedBarChart