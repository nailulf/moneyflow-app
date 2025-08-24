'use client'

import React from 'react'
import { SummaryCards } from '@/components/SummaryCards'
import { SpendingChart } from '@/components/SpendingChart'
import { MonthlyChart } from '@/components/MonthlyChart'
import { TransactionTable } from '@/components/TransactionTable'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { useTransactions } from '@/contexts/TransactionContext'


import { CategoryManager } from '@/components/CategoryManager'


export default function SpendingPage() {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!
  
  // Use shared transaction context
  const { transactions } = useTransactions()

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation actionButton={
        <CategoryManager userId={TEST_USER_ID} />
      } />
      
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <SpendingChart transactions={transactions} />
            
            <TransactionTable 
              transactions={transactions} 
              limit={8}
              userId={TEST_USER_ID}
              enableSelfManagement={true}
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