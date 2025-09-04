'use client'

import React, { useMemo } from 'react'
import { StackedBarChart } from '@/components/StackedBarChart'
import { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

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
    
    // Calculate delta (budget - spending)
    const delta = budget - spending;
    
    return {
      month: monthData.month.slice(0, 3), // Abbreviate month name
      spending,
      budget,
      delta: delta > 0 ? delta : 0, // Only show positive delta (under budget)
      overspent: delta < 0 ? Math.abs(delta) : 0, // Show amount overspent if negative
    };
  });
}

export function SpendingVsBudgetChart({ transactions, budgets, isLoading }: SpendingVsBudgetChartProps) {
  const chartData = useMemo(() => {
    return transformDataForChart(transactions, budgets);
  }, [transactions, budgets]);
  
  // Custom chart config for spending vs budget
  const chartConfig = {
    spending: {
      label: "Spending",
      color: "hsl(var(--chart-2))",
    },
    budget: {
      label: "Budget",
      color: "hsl(var(--chart-1))",
    },
    delta: {
      label: "Under Budget",
      color: "hsl(var(--chart-3))",
    },
    overspent: {
      label: "Over Budget",
      color: "hsl(var(--destructive))",
    },
  };

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
  const tooltipFormatter = (value: number, name: string, props: any) => {
    const { payload } = props;
    const { spending, budget } = payload;
    
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
    } else if (name === 'delta') {
      return [
        `${formatCurrency(value)}`,
        'Under Budget'
      ];
    } else if (name === 'overspent') {
      return [
        `${formatCurrency(value)}`,
        'Over Budget'
      ];
    }
    
    return [formatCurrency(value), name];
  };

  return (
    <StackedBarChart
      data={chartData}
      config={chartConfig}
      title="Spending vs Budget"
      description="Last 12 months"
      showTrend={false}
      tooltipFormatter={tooltipFormatter}
    />
  );
}

export default SpendingVsBudgetChart;