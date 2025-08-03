'use client'

import { useState, useEffect } from 'react'
import { SummaryCards } from '@/components/SummaryCards'
import { SpendingChart } from '@/components/SpendingChart'
import { MonthlyChart } from '@/components/MonthlyChart'
import { TransactionTable } from '@/components/TransactionTable'
import { generateMockTransactions } from '@/lib/mock-data'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent } from '@/components/PageLayout'
import { AddTransactionForm } from '@/components/AddTransactionForm'
import { Transaction } from '@/types/database'
import { TransactionFormData } from '@/lib/validations'

export default function SpendingPage() {
  // In a real app, this would come from your database
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    setTransactions(generateMockTransactions(10))
  }, [])

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation />
      
      <PageLayout>
        
        <MainContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
              <p className="text-sm text-muted-foreground">Your financial dashboard</p>
            </div>
            <AddTransactionForm onTransactionAdded={(newTransaction: TransactionFormData) => {
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
            }} />
          </div>
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
            
            <MonthlyChart 
              transactions={transactions} 
              title="Income Trend"
              type="income"
              displayMonths={6}
            />
          </div>
        </SideContent>
        
      </PageLayout>
    </div>
  )
}