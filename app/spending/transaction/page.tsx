'use client'

import React from 'react'
import { TransactionTable } from '@/components/TransactionTable'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { useTransactions } from '@/contexts/TransactionContext'
import { CategoryManager } from '@/components/CategoryManager'
import { AccountManager } from '@/components/AccountManager'
import { AccountProvider } from '@/contexts/AccountContext'


export default function SpendingTransactionPage() {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!
  
  // Use shared transaction context
  const { transactions, addTransaction } = useTransactions()

  // Filter for expenses only
  const expenses = transactions.filter(t => t.type === 'EXPENSE')

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
          <TransactionTable 
              transactions={transactions} 
              userId={TEST_USER_ID}
              enableSelfManagement={true}
              enableLazyLoading={true}
              pageSize={20}
            />
        </TopContent>
        <ContentWrapper>
        <MainContent>
          <div>
          </div>
        </MainContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}