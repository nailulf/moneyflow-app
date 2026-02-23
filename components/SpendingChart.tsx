'use client'

import { PieChart, Pie, Cell } from 'recharts'
import { Transaction } from '@/types/database'
import { getCategoryBreakdown, formatCurrency } from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/organisms/chart'

interface SpendingChartProps {
  transactions: Transaction[]
}

const chartConfig = {
  amount: {
    label: "Amount",
  },
  food: {
    label: "Food",
    color: "hsl(var(--chart-1))",
  },
  transport: {
    label: "Transport",
    color: "hsl(var(--chart-2))",
  },
  entertainment: {
    label: "Entertainment",
    color: "hsl(var(--chart-3))",
  },
  shopping: {
    label: "Shopping",
    color: "hsl(var(--chart-4))",
  },
  utilities: {
    label: "Utilities",
    color: "hsl(var(--chart-5))",
  },
  other: {
    label: "Other",
    color: "hsl(var(--chart-6))",
  },
} satisfies ChartConfig

export function SpendingChart({ transactions }: SpendingChartProps) {
  const categoryData = getCategoryBreakdown(transactions)
  
  if (categoryData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-title-5 font-semibold text-foreground">Spending Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No spending data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Map category data to use chart config colors
  const chartData = categoryData.map((item, index) => ({
    ...item,
    fill: `var(--color-${item.category.toLowerCase()})` || `hsl(var(--chart-${(index % 6) + 1}))`,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg leading-title-5 font-semibold text-foreground">Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-80 w-full"
        >
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="amount"
              nameKey="category"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name,
                  ]}
                />
              }
            />
            <ChartLegend content={({ payload }) => <ChartLegendContent payload={payload as any} />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
