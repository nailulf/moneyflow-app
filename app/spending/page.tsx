import { SummaryCards } from '@/components/SummaryCards'
import { SpendingChart } from '@/components/SpendingChart'
import { MonthlyChart } from '@/components/MonthlyChart'
import { TransactionTable } from '@/components/TransactionTable'
import { generateMockTransactions } from '@/lib/mock-data'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent } from '@/components/PageLayout'

export default function SpendingPage() {
  // In a real app, this would come from your database
  const transactions = generateMockTransactions(10)

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation />
      
      <PageLayout>
        
        <MainContent>
          <div className="space-y-6">
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