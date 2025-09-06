'use client'

import React, { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer } from 'recharts'
import { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

interface SpendingVsIncomeChartProps {
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
  
  // Calculate income, spending, and net cash flow for each month
  return months.map(monthData => {
    // Filter expense transactions for this month
    const expenseTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      return (
        transDate.getFullYear() === monthData.year &&
        transDate.getMonth() + 1 === monthData.monthNum &&
        t.type === 'EXPENSE'
      );
    });
    
    // Filter income transactions for this month
    const incomeTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      return (
        transDate.getFullYear() === monthData.year &&
        transDate.getMonth() + 1 === monthData.monthNum &&
        t.type === 'INCOME'
      );
    });
    
    // Calculate total spending for the month (absolute value)
    const spending = Math.abs(
      expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
    );
    
    // Calculate total income for the month
    const income = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Calculate net cash flow (income - spending)
    const netCashFlow = income - spending;
    
    return {
      month: monthData.month.slice(0, 3), // Abbreviate month name
      spending,
      income,
      netCashFlow,
    };
  });
}

export function SpendingVsBudgetChart({ transactions, budgets, isLoading }: SpendingVsIncomeChartProps) {
  // Start with the latest month (last 8 months from the most recent data)
  const [currentMonthIndex, setCurrentMonthIndex] = useState(4);
  
  const allChartData = useMemo(() => {
    return transformDataForChart(transactions, budgets);
  }, [transactions, budgets]);
  
  // Get 8 months of data starting from currentMonthIndex
  const chartData = useMemo(() => {
    return allChartData.slice(currentMonthIndex, currentMonthIndex + 8);
  }, [allChartData, currentMonthIndex]);
  
  const canGoLeft = currentMonthIndex > 0;
  const canGoRight = currentMonthIndex + 8 < allChartData.length;
  
  const handlePrevious = () => {
    if (canGoLeft) {
      setCurrentMonthIndex(prev => Math.max(0, prev - 1));
    }
  };
  
  const handleNext = () => {
    if (canGoRight) {
      setCurrentMonthIndex(prev => Math.min(allChartData.length - 8, prev + 1));
    }
  };
  
  // Custom chart config for spending vs income with monochrome blue colors
  const chartConfig = {
    spending: {
      label: "Spending",
      color: "hsl(220, 50%, 70%)", // Light blue for spending
    },
    income: {
      label: "Income",
      color: "hsl(220, 70%, 50%)", // Dark blue for income
    },
    netCashFlow: {
      label: "Net Cash Flow",
      color: "hsl(220, 60%, 60%)", // Medium blue for net cash flow
    },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs Spending</CardTitle>
          <CardDescription>Loading financial data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip content component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const spending = data.spending || 0;
      const income = data.income || 0;
      const netCashFlow = data.netCashFlow || 0;
      
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: chartConfig.income.color }}
              />
              <span className="text-sm text-muted-foreground">Income:</span>
              <span className="text-sm font-medium">{formatCurrency(income)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: chartConfig.spending.color }}
              />
              <span className="text-sm text-muted-foreground">Spending:</span>
              <span className="text-sm font-medium">{formatCurrency(spending)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: chartConfig.netCashFlow.color }}
              />
              <span className="text-sm text-muted-foreground">Net Cash Flow:</span>
              <span className={`text-sm font-medium ${
                netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(netCashFlow)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Income vs Spending Analysis</CardTitle>
            <CardDescription>
              Showing {chartData.length} months 
              {allChartData.length > 8 && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({currentMonthIndex + 1}-{currentMonthIndex + chartData.length} of {allChartData.length})
                </span>
              )}
            </CardDescription>
          </div>
          {allChartData.length > 8 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={!canGoLeft}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!canGoRight}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[30vh] min-h-[200px]">
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
              content={<CustomTooltip />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="income"
              fill={chartConfig.income.color}
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