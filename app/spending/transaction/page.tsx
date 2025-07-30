'use client'

import { TransactionTable } from '@/components/TransactionTable'
import { AddTransactionForm } from '@/components/AddTransactionForm'
import { generateMockTransactions } from '@/lib/mock-data'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { Transaction } from '@/types/database'
import { TransactionFormData } from '@/lib/validations'

export default function SpendingTransactionPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(generateMockTransactions(25))

  const handleTransactionAdded = (newTransaction: TransactionFormData) => {
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

  // Filter for expenses only
  const expenses = transactions.filter(t => t.amount < 0)
  const recentExpenses = expenses.slice(0, 5)
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation />
      
      <PageLayout>
        
        <MainContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Transactions</h2>
                <p className="text-muted-foreground">Manage and track your spending transactions</p>
              </div>
              <AddTransactionForm onTransactionAdded={handleTransactionAdded} />
            </div>
            
            <TransactionTable 
              transactions={transactions}
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
                    <span className="text-sm text-muted-foreground">Total Expenses</span>
                    <span className="font-medium text-red-600">${totalExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Transactions</span>
                    <span className="font-medium">{transactions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Expense Transactions</span>
                    <span className="font-medium">{expenses.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Latest spending activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentExpenses.map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">{transaction.category}</p>
                      </div>
                      <span className="text-sm font-medium text-red-600">
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </SideContent>
        
      </PageLayout>
    </div>
  )
}