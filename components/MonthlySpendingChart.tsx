'use client'

import React, { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, Cell } from 'recharts'
import { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/molecules/card'
import { Button } from '@/components/ui/atoms/button'
import { Skeleton } from '@/components/ui/atoms/skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/organisms/chart'

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
  selectedYear?: number
  selectedMonth?: number
  onMonthClick?: (year: number, month: number) => void
}

// Function to transform data for the chart
function transformDataForChart(transactions: Transaction[], budgets: TransformedBudget[]) {
  // If no transactions, return empty array
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Find the actual date range of transactions
  const transactionDates = transactions.map(t => new Date(t.date));
  const minDate = new Date(Math.min(...transactionDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...transactionDates.map(d => d.getTime())));
  
  // Generate months based on actual transaction data range
  const months = [];
  const startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  
  // Generate all months from start to end
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    months.push({
      month: monthName,
      year,
      monthNum: month,
      key: `${year}-${month.toString().padStart(2, '0')}`
    });
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  console.log(`📊 Chart data range: ${months.length} months from ${months[0]?.month} ${months[0]?.year} to ${months[months.length-1]?.month} ${months[months.length-1]?.year}`);
  
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
      year: monthData.year,
      monthNum: monthData.monthNum,
      spending,
      income,
      netCashFlow,
    };
  });
}

export function SpendingVsBudgetChart({ transactions, budgets, isLoading, selectedYear, selectedMonth, onMonthClick }: SpendingVsIncomeChartProps) {
  const allChartData = useMemo(() => {
    return transformDataForChart(transactions, budgets);
  }, [transactions, budgets]);
  
  // Start with the most recent months (show last 8 months by default)
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => {
    return Math.max(0, allChartData.length - 8);
  });
  
  // Update currentMonthIndex when data changes
  React.useEffect(() => {
    setCurrentMonthIndex(Math.max(0, allChartData.length - 8));
  }, [allChartData.length]);
  
  // Get 8 months of data starting from currentMonthIndex
  const chartData = useMemo(() => {
    const displayCount = Math.min(8, allChartData.length);
    return allChartData.slice(currentMonthIndex, currentMonthIndex + displayCount);
  }, [allChartData, currentMonthIndex]);
  
  const displayCount = Math.min(8, allChartData.length);
  const canGoLeft = currentMonthIndex > 0;
  const canGoRight = currentMonthIndex + displayCount < allChartData.length;
  
  const handlePrevious = () => {
    if (canGoLeft) {
      setCurrentMonthIndex(prev => Math.max(0, prev - 1));
    }
  };
  
  const handleNext = () => {
    if (canGoRight) {
      setCurrentMonthIndex(prev => Math.min(allChartData.length - displayCount, prev + 1));
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
          <p className="font-medium text-foreground mb-2">
            {label} {data.year}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: chartConfig.income.color }}
              />
              <span className="text-sm leading-body-sm text-muted-foreground">Income:</span>
              <span className="text-sm leading-body-sm font-medium">{formatCurrency(income)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: chartConfig.spending.color }}
              />
              <span className="text-sm leading-body-sm text-muted-foreground">Spending:</span>
              <span className="text-sm leading-body-sm font-medium">{formatCurrency(spending)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: chartConfig.netCashFlow.color }}
              />
              <span className="text-sm leading-body-sm text-muted-foreground">Net Cash Flow:</span>
              <span className={`text-sm leading-body-sm font-medium ${
                netCashFlow >= 0 ? 'text-success' : 'text-destructive'
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
              {allChartData.length === 0 ? (
                "No transaction data available"
              ) : (
                <>
                  {onMonthClick ? 'Click a month to filter' : `Showing ${chartData.length} months`}
                  {allChartData.length > displayCount && (
                    <span className="text-xs leading-caption text-muted-foreground ml-1">
                      ({currentMonthIndex + 1}-{currentMonthIndex + chartData.length} of {allChartData.length})
                    </span>
                  )}
                </>
              )}
            </CardDescription>
          </div>
          {allChartData.length > displayCount && (
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
        {allChartData.length === 0 ? (
          <div className="h-[30vh] min-h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg leading-title-5 font-medium">No transaction data available</p>
              <p className="text-sm leading-body-sm mt-2">Add some transactions to see your spending vs income analysis</p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[30vh] min-h-[200px]">
            <BarChart
              accessibilityLayer
              data={chartData}
              style={onMonthClick ? { cursor: 'pointer' } : undefined}
            >
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
                radius={[4, 4, 0, 0]}
                onClick={(data: any) => {
                  if (onMonthClick && data?.year && data?.monthNum) {
                    onMonthClick(data.year, data.monthNum)
                  }
                }}
              >
                {chartData.map((entry, index) => {
                  const isSelected = selectedYear !== undefined && selectedMonth !== undefined &&
                    entry.year === selectedYear && entry.monthNum === selectedMonth
                  return (
                    <Cell
                      key={`income-${index}`}
                      fill={chartConfig.income.color}
                      opacity={selectedMonth !== undefined ? (isSelected ? 1 : 0.4) : 1}
                      style={onMonthClick ? { cursor: 'pointer' } : undefined}
                    />
                  )
                })}
              </Bar>
              <Bar
                dataKey="spending"
                radius={[4, 4, 0, 0]}
                onClick={(data: any) => {
                  if (onMonthClick && data?.year && data?.monthNum) {
                    onMonthClick(data.year, data.monthNum)
                  }
                }}
              >
                {chartData.map((entry, index) => {
                  const isSelected = selectedYear !== undefined && selectedMonth !== undefined &&
                    entry.year === selectedYear && entry.monthNum === selectedMonth
                  return (
                    <Cell
                      key={`spending-${index}`}
                      fill={chartConfig.spending.color}
                      opacity={selectedMonth !== undefined ? (isSelected ? 1 : 0.4) : 1}
                      style={onMonthClick ? { cursor: 'pointer' } : undefined}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default SpendingVsBudgetChart;