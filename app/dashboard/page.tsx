import { SummaryCards } from '@/components/SummaryCards'
import { SpendingChart } from '@/components/SpendingChart'
import { MonthlyChart } from '@/components/MonthlyChart'
import { TransactionTable } from '@/components/TransactionTable'
import { generateMockTransactions } from '@/lib/mock-data'

export default function DashboardPage() {
  // In a real app, this would come from your database
  const transactions = generateMockTransactions(6)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome to your financial overview</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">My portfolio</h1>
          </div>
          
          <SummaryCards transactions={transactions} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <SpendingChart transactions={transactions} />
            <TransactionTable transactions={transactions} limit={8} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
               <MonthlyChart 
                 transactions={transactions} 
                 title="Income vs Expenses"
                 type="both"
               />
             </div>
             <div>
               <MonthlyChart 
                 transactions={transactions} 
                 title="Income Trend"
                 type="income"
               />
             </div>
          </div>
        </div>
      </main>
    </div>
  )
}