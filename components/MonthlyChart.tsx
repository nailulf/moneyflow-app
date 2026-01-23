'use client'

import { BarChart, Bar, XAxis, CartesianGrid } from 'recharts'
import { Transaction } from '@/types/database'
import { getMonthlyData, formatCurrency } from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface MonthlyChartProps {
  transactions: Transaction[]
  type: 'spending' | 'income' | 'both'
  title: string
  displayMonths?: number
}

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--success))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--destructive))",
  },
  net: {
    label: "Net",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function MonthlyChart({ transactions, type, title, displayMonths = 6 }: MonthlyChartProps) {
  const monthlyData = getMonthlyData(transactions, displayMonths)
  
  if (monthlyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tickLine={false}
              axisLine={false}
            />

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
            
            {(type === 'income' || type === 'both') && (
              <Bar 
                dataKey="income" 
                fill="var(--color-income)" 
                radius={[2, 2, 0, 0]}
              />
            )}
            
            {(type === 'spending' || type === 'both') && (
              <Bar 
                dataKey="expenses" 
                fill="var(--color-expenses)" 
                radius={[2, 2, 0, 0]}
              />
            )}
            
            {type === 'both' && (
              <Bar 
                dataKey="net" 
                fill="var(--color-net)" 
                radius={[2, 2, 0, 0]}
              />
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}