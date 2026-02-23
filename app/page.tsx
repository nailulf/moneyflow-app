'use client'

import { useMemo } from 'react'
import NetWorthOverview from '@/components/NetWorthOverview'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { OnboardingBanner } from '@/components/features/onboarding'
import { FinancialGoalsSection } from '@/components/features/goals'
import { BudgetStatus } from '@/components/BudgetStatus'
import { useBudgetSnapshot } from '@/hooks/useBudgetSnapshot'
import { useTransactions } from '@/contexts/TransactionContext'

export default function Home() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const {
    snapshot,
    isLoading,
    noSnapshot,
    error,
  } = useBudgetSnapshot('monthly', currentYear, currentMonth)

  const { transactions } = useTransactions()

  // Filter transactions for current month
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
    })
  }, [transactions, currentYear, currentMonth])

  return (
     <div className="flex flex-col h-full">
      <OnboardingBanner />
      <PageLayout>
        <ContentWrapper>
          <MainContent>
            <NetWorthOverview />
          </MainContent>
          <SideContent>
              <div className="space-y-4">
                <FinancialGoalsSection />
                <BudgetStatus
                  timeRange="monthly"
                  selectedYear={currentYear}
                  selectedMonth={currentMonth}
                  snapshot={snapshot}
                  isLoading={isLoading}
                  noSnapshot={noSnapshot}
                  error={error}
                  transactions={currentMonthTransactions}
                />
              </div>
          </SideContent>
        </ContentWrapper>
      </PageLayout>

      </div>
  )
}
