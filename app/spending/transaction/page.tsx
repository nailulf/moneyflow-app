'use client'

import React from 'react'
import { TransactionTable } from '@/components/features/transaction/TransactionTable'
import { SpendingNavigation } from '@/components/features/navigation/TopNavigation'
import { PageLayout, MainContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { useTransactions } from '@/contexts/TransactionContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/molecules/tabs'
import { RecurringTransactionsList } from '@/components/features/transaction/RecurringTransactionsList'


export default function SpendingTransactionPage() {
  
  // Use shared transaction context
  const { transactions, addTransaction } = useTransactions()

  // Filter for expenses only
  const expenses = transactions.filter(t => t.type === 'EXPENSE')

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation />
      
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
                enableSelfManagement={true}
                enableLazyLoading={true}
                pageSize={20}
              />
            </TabsContent>
            
            <TabsContent value="recurring" className="mt-0">
              <RecurringTransactionsList />
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