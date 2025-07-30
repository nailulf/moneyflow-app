'use client'

import { useState, useEffect } from 'react'
import { SummaryCards } from '@/components/SummaryCards'
import { SpendingChart } from '@/components/SpendingChart'
import { MonthlyChart } from '@/components/MonthlyChart'
import { TransactionTable } from '@/components/TransactionTable'
import { AddTransactionForm } from '@/components/AddTransactionForm'
import { FileUpload } from '@/components/FileUpload'
import { generateMockTransactions } from '@/lib/mock-data'
import { Transaction } from '@/types/database'
import { TransactionFormData } from '@/lib/validations'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { BarChart3, Upload, Plus, Home as HomeIcon } from 'lucide-react'

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

  const handleFileProcessed = (newTransactions: Transaction[]) => {
    // Convert processed transactions to Transaction objects
    const processedTransactions: Transaction[] = newTransactions.map((t, index) => ({
      id: `imported-${Date.now()}-${index}`,
      user_id: 'user1',
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: t.category,
      merchant: t.merchant || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    setTransactions(prev => [...processedTransactions, ...prev])
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">MoneyFlow</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AddTransactionForm onTransactionAdded={handleTransactionAdded} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <SummaryCards transactions={transactions} />

        {/* Portfolio Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Portfolio Chart */}
          <div className="lg:col-span-1">
            <SpendingChart transactions={transactions} />
          </div>
          
          {/* Performance Charts */}
          <div className="lg:col-span-1">
            <MonthlyChart
              transactions={transactions}
              type="both"
              title="Income vs Expenses"
              // hideXAxis={true}
              displayMonths={12}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
