'use client'

import React from 'react'
import { TransactionTable } from '@/components/TransactionTable'
import { AddTransactionButton } from '@/components/AddTransactionButton'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactions } from '@/contexts/TransactionContext'
import { CategoryManager } from '@/components/CategoryManager'


export default function SpendingTransactionPage() {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID || 'test-user-123'
  
  // Use shared transaction context
  const { transactions, addTransaction } = useTransactions()

  // Filter for expenses only
  const expenses = transactions.filter(t => t.type === 'EXPENSE')
  const recentExpenses = expenses.slice(0, 5)
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation actionButton={<div>
        <CategoryManager userId={TEST_USER_ID} />
        </div>} />
      
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <div className="flex justify-end">
              <AddTransactionButton userId={TEST_USER_ID} onTransactionAdded={addTransaction} />
            </div>
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
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Transaction summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Recent expenses</span>
                    <span className="text-sm font-medium">{recentExpenses.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total expenses</span>
                    <span className="text-sm font-medium">{totalExpenses.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SideContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}