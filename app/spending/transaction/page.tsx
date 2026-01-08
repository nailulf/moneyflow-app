'use client'

import React from 'react'
import { TransactionTable } from '@/components/TransactionTable'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { useTransactions } from '@/contexts/TransactionContext'
import { CategoryManager } from '@/components/CategoryManager'
import { AccountManager } from '@/components/AccountManager'
import { AccountProvider } from '@/contexts/AccountContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RecurringTransactionsList } from '@/components/RecurringTransactionsList'


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
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">All Transactions</TabsTrigger>
                <TabsTrigger value="recurring">Recurring Transactions</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-0">
              <TransactionTable 
                transactions={transactions} 
                userId={TEST_USER_ID}
                enableSelfManagement={true}
                enableLazyLoading={true}
                pageSize={20}
              />
            </TabsContent>
            
            <TabsContent value="recurring" className="mt-0">
              <RecurringTransactionsList userId={TEST_USER_ID} />
            </TabsContent>
          </Tabs>
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