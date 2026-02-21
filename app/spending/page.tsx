'use client'

import { SummaryCards } from '@/components/SummaryCards'
import SpendingVsBudgetChart from '@/components/MonthlySpendingChart'
import { TransactionTable } from '@/components/TransactionTable'
import { SpendingNavigation } from '@/components/features/navigation/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { useTransactions } from '@/contexts/TransactionContext'
import { useBudgets } from '@/contexts/BudgetContext'




export default function SpendingPage() {
  // Use shared transaction context
  const { transactions } = useTransactions()
  
  // Get current date for budget data
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-indexed
  
  // Use budget context hook
  const { transformedBudgets, loading: budgetLoading } = useBudgets()

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation />
      
      <PageLayout>
        <TopContent>
          <SpendingVsBudgetChart 
            transactions={transactions} 
            budgets={transformedBudgets}
            isLoading={budgetLoading}
          />
        </TopContent>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            
            <TransactionTable 
              transactions={transactions} 
              limit={8}
              enableSelfManagement={true}
            />
          </div>
        </MainContent>
        
        <SideContent>
          <div className="space-y-4">
            <SummaryCards transactions={transactions} />
          </div>
        </SideContent>
        </ContentWrapper>
      </PageLayout>
      

    </div>
  )
}