'use client'

import React, { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer } from 'recharts'
import { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

interface TransformedBudget {
  id: string
  name: string
  totalAmount: number
  period: 'monthly' | 'yearly'
  categories: {
    id: string
    category: string
    budgetAmount: number
    spentAmount: number
    status: 'good' | 'warning' | 'over'
    color: string
  }[]
}

interface SpendingVsBudgetChartProps {
  transactions: Transaction[]
  budgets: TransformedBudget[]
  isLoading: boolean
}

// Function to transform data for the chart
function transformDataForChart(transactions: Transaction[], budgets: TransformedBudget[]) {
  // Get the last 12 months
  const months = [];
  const today = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    
    months.unshift({
      month: monthName,
      year,
      monthNum: month,
      key: `${year}-${month.toString().padStart(2, '0')}`
    });
  }
  
  // Calculate spending for each month
  return months.map(monthData => {
    // Filter transactions for this month
    const monthTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      return (
        transDate.getFullYear() === monthData.year &&
        transDate.getMonth() + 1 === monthData.monthNum &&
        t.type === 'EXPENSE'
      );
    });
    
    // Calculate total spending for the month
    const spending = Math.abs(
      monthTransactions.reduce((sum, t) => sum + t.amount, 0)
    );
    
    // Find budget for this month if exists
    const monthBudget = budgets.find(b => 
      b.period === 'monthly' && 
      b.categories.length > 0
    );
    
    // Calculate total budget amount
    const budget = monthBudget ? monthBudget.totalAmount : 0;
    
    return {
      month: monthData.month.slice(0, 3), // Abbreviate month name
      spending,
      budget,
    };
  });
}

export function SpendingVsBudgetChart({ transactions, budgets, isLoading }: SpendingVsBudgetChartProps) {
  const chartData = useMemo(() => {
    return transformDataForChart(transactions, budgets);
  }, [transactions, budgets]);
  
  // Custom chart config for spending vs budget with soft blue colors
  const chartConfig = {
    spending: {
      label: "Spending",
      color: "hsl(210, 100%, 70%)", // Soft light blue
    },
    budget: {
      label: "Budget",
      color: "hsl(210, 100%, 50%)", // Medium dark blue
    },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending vs Budget</CardTitle>
          <CardDescription>Loading budget data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip formatter to show spending vs budget
  const tooltipFormatter = (value: number, name: string, props: Record<string, unknown>) => {
    const payload = props.payload as Record<string, number>;
    const spending = typeof payload.spending === 'number' ? payload.spending : 0;
    const budget = typeof payload.budget === 'number' ? payload.budget : 0;
    
    // Calculate percentage of budget spent
    const percentSpent = budget > 0 ? (spending / budget) * 100 : 0;
    
    // Format the tooltip content based on the data key
    if (name === 'spending') {
      return [
        `${formatCurrency(value)}`,
        `Spending (${percentSpent.toFixed(1)}% of budget)`
      ];
    } else if (name === 'budget') {
      return [
        `${formatCurrency(value)}`,
        'Budget'
      ];
    }
    
    return [formatCurrency(value), name];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending vs Budget</CardTitle>
        <CardDescription>Last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart accessibilityLayer data={chartData}>
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
            <Bar
              dataKey="budget"
              fill={chartConfig.budget.color}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="spending"
              fill={chartConfig.spending.color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default SpendingVsBudgetChart;