'use client'

import { useEffect } from 'react'
import { SummaryCards } from '@/components/SummaryCards'
import { SpendingChart } from '@/components/SpendingChart'
import { MonthlyChart } from '@/components/MonthlyChart'
import { TransactionTable } from '@/components/TransactionTable'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { useTransactionManager } from '@/hooks/use-transaction-manager'
import { CategoryManager } from '@/components/CategoryManager'


export default function SpendingPage() {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
  
  // In a real app, this would come from your database
  const { transactions, loadTransactions } = useTransactionManager({
    userId: TEST_USER_ID
  })

  useEffect(() => {
    // Load transactions from database or use mock data for development
    loadTransactions()
  }, [loadTransactions])

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation actionButton={<CategoryManager userId={TEST_USER_ID} />} />
      
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <SpendingChart transactions={transactions} />
            
            <TransactionTable 
              transactions={transactions} 
              limit={8} 
            />
            
            <MonthlyChart 
              transactions={transactions} 
              title="Income vs Expenses"
              type="both"
              displayMonths={12}
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