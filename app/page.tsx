'use client'

import { useState } from 'react'
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
  const [transactions, setTransactions] = useState<Transaction[]>(() => generateMockTransactions(6))

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

  const handleFileProcessed = (newTransactions: any[]) => {
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
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="border-b border-gray-200">
            <TabsList className="bg-transparent h-auto p-0 -mb-px flex space-x-8">
              <TabsTrigger 
                value="dashboard" 
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 bg-transparent"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="upload" 
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 bg-transparent"
              >
                Upload
              </TabsTrigger>
              <TabsTrigger 
                value="transactions" 
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 bg-transparent"
              >
                Transactions
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">My portfolio</h2>
            </div>
            
            {/* Summary Cards */}
            <SummaryCards transactions={transactions} />
            
            {/* Portfolio Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Portfolio Chart */}
              <div className="lg:col-span-1">
                <SpendingChart transactions={transactions} />
              </div>
              
              {/* Holdings Table */}
               <div className="lg:col-span-1">
                 <TransactionTable transactions={transactions} limit={8} />
               </div>
            </div>
            
            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MonthlyChart 
                transactions={transactions} 
                type="both" 
                title="Income vs Expenses" 
              />
              <MonthlyChart 
                transactions={transactions} 
                type="income" 
                title="Income Trend" 
              />
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Upload Statements</h2>
              <p className="text-gray-600">Upload your bank statements to automatically import transactions</p>
            </div>
            
            <FileUpload onFileProcessed={handleFileProcessed} />
            
            {/* Recent uploads or processing status could go here */}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">All Transactions</h2>
                <p className="text-gray-600">View and manage all your transactions</p>
              </div>
              <AddTransactionForm onTransactionAdded={handleTransactionAdded} />
            </div>
            
            <TransactionTable transactions={transactions} limit={50} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}