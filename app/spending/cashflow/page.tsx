'use client'

import React, { useState, useMemo } from 'react'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { useTransactions } from '@/contexts/TransactionContext'
import { CashFlowSankey } from '@/components/CashFlowSankey'
import { PeriodPicker } from '@/components/PeriodPicker'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, calculateTotalIncome, calculateTotalSpending } from '@/lib/data-utils'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isSameMonth, isSameYear, subMonths, subYears, differenceInDays } from 'date-fns'
import { useCategories } from '@/contexts/CategoryContext'
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react'

export default function CashFlowPage() {
  
  // Use shared transaction context
  const { transactions, loading } = useTransactions()
  const { getCategoryName } = useCategories()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')

  // Filter transactions for the selected period
  const currentTransactions = useMemo(() => {
    if (viewMode === 'month') {
      return transactions.filter(t => isSameMonth(parseISO(t.date), selectedDate))
    } else {
      return transactions.filter(t => isSameYear(parseISO(t.date), selectedDate))
    }
  }, [transactions, selectedDate, viewMode])

  // Filter transactions for the previous period for comparison
  const previousTransactions = useMemo(() => {
    if (viewMode === 'month') {
      const lastMonth = subMonths(selectedDate, 1)
      return transactions.filter(t => isSameMonth(parseISO(t.date), lastMonth))
    } else {
      const lastYear = subYears(selectedDate, 1)
      return transactions.filter(t => isSameYear(parseISO(t.date), lastYear))
    }
  }, [transactions, selectedDate, viewMode])
  
  // Calculate summary data for selected period
  const totalIncome = calculateTotalIncome(currentTransactions)
  const totalExpenses = calculateTotalSpending(currentTransactions)
  const netCashFlow = totalIncome - totalExpenses

  // Comparison logic
  const previousExpenses = calculateTotalSpending(previousTransactions)
  const expenseChange = previousExpenses > 0 
    ? ((totalExpenses - previousExpenses) / previousExpenses) * 100 
    : 0
  
  const periodStart = viewMode === 'month' ? startOfMonth(selectedDate) : startOfYear(selectedDate)
  const periodEnd = viewMode === 'month' ? endOfMonth(selectedDate) : endOfYear(selectedDate)
  const daysInPeriod = differenceInDays(periodEnd, periodStart) + 1
  const avgDailySpend = totalExpenses / daysInPeriod

  // Sankey Date Range
  const dateRange = {
    from: periodStart,
    to: periodEnd
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation />
      
      <PageLayout>
        <TopContent>
          {/* Header Row */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-2">Cash Flow</h2>
              <p className="text-muted-foreground">Visualize your income and expenses flow</p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'month' | 'year')} className="w-auto">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                  <TabsTrigger value="year" className="text-xs">Year</TabsTrigger>
                </TabsList>
              </Tabs>
              <PeriodPicker 
                date={selectedDate} 
                onDateChange={setSelectedDate} 
                mode={viewMode}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-0">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Income</p>
                    <p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Expenses
                      <span className={`ml-2 text-xs ${expenseChange > 0 ? 'text-destructive' : 'text-success'}`}>
                        {expenseChange > 0 ? '↑' : '↓'} {Math.abs(expenseChange).toFixed(1)}%
                      </span>
                    </p>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                    <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(netCashFlow)}
                    </p>
                  </div>
                  {netCashFlow >= 0 ? 
                    <TrendingUp className="h-8 w-8 text-success" /> : 
                    <TrendingDown className="h-8 w-8 text-destructive" />
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        </TopContent>
        
        <ContentWrapper>
          <MainContent className="sm:w-full md:w-full lg:w-full sm:max-w-full">
            <CashFlowSankey 
              transactions={transactions} 
              dateRange={dateRange} 
              getCategoryName={getCategoryName}
            />
          </MainContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}
