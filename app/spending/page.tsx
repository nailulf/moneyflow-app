'use client'

import React, { useState, useEffect } from 'react'
import { SummaryCards } from '@/components/SummaryCards'
import SpendingVsBudgetChart from '@/components/SpendingVsBudgetChart'
import { TransactionTable } from '@/components/TransactionTable'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { useTransactions } from '@/contexts/TransactionContext'
import { useBudgetData } from '@/hooks/useBudgetData'


import { CategoryManager } from '@/components/CategoryManager'
import { AccountManager } from '@/components/AccountManager'
import { AccountProvider } from '@/contexts/AccountContext'


export default function SpendingPage() {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!
  
  // Use shared transaction context
  const { transactions } = useTransactions()
  
  // Get current date for budget data
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-indexed
  
  // Use budget data hook
  const { transformedBudgets, loading: budgetLoading } = useBudgetData(
    TEST_USER_ID,
    currentYear,
    currentMonth,
    'monthly',
    transactions
  )

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation actionButton={
        <div className="flex items-center gap-2">
          <CategoryManager userId={TEST_USER_ID} />
          <AccountProvider userId={TEST_USER_ID}>
            <AccountManager userId={TEST_USER_ID} />
          </AccountProvider>
        </div>
      } />
      
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
              userId={TEST_USER_ID}
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