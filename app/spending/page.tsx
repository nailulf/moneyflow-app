import { SummaryCards } from '@/components/SummaryCards'
import { SpendingChart } from '@/components/SpendingChart'
import { MonthlyChart } from '@/components/MonthlyChart'
import { TransactionTable } from '@/components/TransactionTable'
import { generateMockTransactions } from '@/lib/mock-data'

export default function DashboardPage() {
  // In a real app, this would come from your database
  const transactions = generateMockTransactions(10)

  return (
    <div className="">
      {/* Main Content */}
      <main className="">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">My Spendings</h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Main Content Area - 70% */}
            <div className="lg:col-span-7 space-y-6">
              <SpendingChart 
                transactions={transactions} 
              />
              <TransactionTable 
                transactions={transactions} 
                limit={6} 
              />
              <MonthlyChart 
                transactions={transactions} 
                title="Income vs Expenses"
                type="both"
                displayMonths={12}
              />
              <MonthlyChart 
                transactions={transactions} 
                title="Income Trend"
                type="income"
                displayMonths={12}
              />
            </div>
            
            {/* Sidebar - 30% */}
            <div className="lg:col-span-3 space-y-4">
              {/* Single Metric Cards */}
              <SummaryCards transactions={transactions} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}