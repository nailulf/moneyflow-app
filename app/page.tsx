'use client'

import { useState, useEffect } from 'react'
import { SummaryCards } from '@/components/SummaryCards'
import { SpendingChart } from '@/components/SpendingChart'
import { MonthlyChart } from '@/components/MonthlyChart'
import { AddTransactionForm } from '@/components/AddTransactionForm'
import { generateMockTransactions } from '@/lib/mock-data'
import { Transaction } from '@/types/database'
import { TransactionFormData } from '@/lib/validations'
import { DashboardNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent } from '@/components/PageLayout'

export default function Home() {
  // In a real app, this would come from your database
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    setTransactions(generateMockTransactions(12))
  }, [])

  const handleTransactionAdded = (newTransaction: TransactionFormData) => {
    // Create a new transaction object
    const transaction: Transaction = {
      id: `new-${Date.now()}`,
      user_id: 'user1',
      date: newTransaction.date,
      description: newTransaction.description,
      amount: newTransaction.amount,
      category: newTransaction.category,
      merchant: newTransaction.merchant || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    setTransactions(prev => [transaction, ...prev])
  }



  return (
    <div className="flex flex-col h-full">
      <DashboardNavigation />
      
      <PageLayout>
        
        <MainContent>
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
              <p className="text-sm text-muted-foreground">Your financial dashboard</p>
            </div>
            <AddTransactionForm onTransactionAdded={handleTransactionAdded} />
          </div>
          
          <SummaryCards transactions={transactions} />
          
          <div className="mt-6">
            <MonthlyChart
              transactions={transactions}
              type="both"
              title="Income vs Expenses"
              displayMonths={12}
            />
          </div>
        </MainContent>
        
        <SideContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Spending Breakdown</h3>
              <SpendingChart transactions={transactions} />
            </div>
          </div>
        </SideContent>
        
      </PageLayout>
    </div>
  )
}
