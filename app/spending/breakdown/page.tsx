'use client'

import { useState, useEffect, useCallback } from 'react'
import { CashFlowBreakdown } from '@/components/CashFlowBreakdown'
import { SpendingNavigation } from '@/components/features/navigation/TopNavigation'
import { PageLayout, MainContent, TopContent, ContentWrapper, SideContent } from '@/components/PageLayout'
import { useTransactions } from '@/contexts/TransactionContext'
import { SpendingVsBudgetChart } from '@/components/MonthlySpendingChart'
import { BudgetFilterBar } from '@/components/BudgetFilterBar'
import { useBudgetSnapshot } from '@/hooks/useBudgetSnapshot'
import { useBudgetPlan } from '@/hooks/useBudgetPlan'
import { useBudgets } from '@/contexts/BudgetContext'
import { CashFlowSummary } from '@/components/CashFlowSummary'
import { BudgetStatus } from '@/components/BudgetStatus'

export default function BudgetReportPage() {
  // Initialize date state — default to server-safe values, then correct on mount
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [selectedMonth, setSelectedMonth] = useState<number>(1)
  const [isInitialized, setIsInitialized] = useState(false)
  // Use budget context hook
  const { transformedBudgets, loading: budgetLoading } = useBudgets()


  useEffect(() => {
    const now = new Date()
    setSelectedYear(now.getFullYear())
    setSelectedMonth(now.getMonth() + 1)
    setIsInitialized(true)
  }, [])

  const [timeRange, setTimeRange] = useState<'monthly' | 'yearly'>('monthly')

  // Fetch snapshot for the selected period (only after date is initialized)
  const {
    snapshot,
    isLoading: snapshotLoading,
    noSnapshot,
    error: snapshotError,
    refetch: refetchSnapshot,
  } = useBudgetSnapshot(
    timeRange,
    selectedYear,
    timeRange === 'monthly' ? selectedMonth : undefined,
    isInitialized
  )

  // Fetch budget plan for inline editing
  const {
    plan,
    isLoading: planLoading,
    refetch: refetchPlan,
  } = useBudgetPlan(timeRange, isInitialized)

  const handlePlanSaved = useCallback(async () => {
    await Promise.all([refetchSnapshot(), refetchPlan()])
  }, [refetchSnapshot, refetchPlan])

  const handleMonthClick = useCallback((year: number, month: number) => {
    setSelectedYear(year)
    setSelectedMonth(month)
    setTimeRange('monthly')
  }, [])

  const { transactions } = useTransactions()

  // Filter transactions for the CashFlowBreakdown and income/expense cards
  const filteredTransactions = transactions.filter((transaction) => {
    const d = new Date(transaction.date)
    if (timeRange === 'yearly') {
      return d.getFullYear() === selectedYear
    }
    return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth
  })

  const isLoading = !isInitialized || snapshotLoading

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation />

      <PageLayout>
        <TopContent>
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-1">Budget Report</h2>
              <p className="text-sm text-muted-foreground">
                View your budget performance and spending patterns
              </p>
            </div>
            <BudgetFilterBar
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
          </div>
          <SpendingVsBudgetChart
                transactions={transactions}
                budgets={transformedBudgets}
                isLoading={budgetLoading}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onMonthClick={handleMonthClick}
              /> 
        </TopContent>

        <ContentWrapper>
          <MainContent>
            <div className="space-y-6">
              <CashFlowBreakdown
                transactions={filteredTransactions}
                period={timeRange}
                budgetSnapshot={snapshot}
                budgetSnapshotLoading={isLoading}
                budgetNoSnapshot={noSnapshot}
                budgetSnapshotError={snapshotError}
                budgetPlan={plan}
                budgetPlanLoading={planLoading}
                onBudgetPlanSaved={handlePlanSaved}
              />
            </div>
          </MainContent>
          <SideContent>
            <CashFlowSummary
              transactions={filteredTransactions}
            />
            <BudgetStatus
              timeRange={timeRange}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              snapshot={snapshot}
              isLoading={isLoading}
              noSnapshot={noSnapshot}
              error={snapshotError}
              transactions={filteredTransactions}
            />
          </SideContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}
