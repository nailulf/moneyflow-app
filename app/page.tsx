'use client'

import { useMemo } from 'react'
import NetWorthOverview from '@/components/NetWorthOverview'
import { PageLayout, MainContent, SideContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { OnboardingBanner } from '@/components/features/onboarding'
import { FinancialGoalsSection } from '@/components/features/goals'
import { BudgetStatus } from '@/components/BudgetStatus'
import { useBudgetSnapshot } from '@/hooks/useBudgetSnapshot'
import { useTransactions } from '@/contexts/TransactionContext'
import { MobileHome } from '@/components/features/home/MobileHome'

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
    <>
      <MobileHome />
      <div className="hidden h-full flex-col md:flex">
        <PageLayout>
          <TopContent>
            <OnboardingBanner />
          </TopContent>
          <ContentWrapper>
            <MainContent>
              <NetWorthOverview />
            </MainContent>
            <SideContent>
              <div className="space-y-2">
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
    </>
  )
}
