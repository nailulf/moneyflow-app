import { SpendingChart } from '@/components/SpendingChart'
import { MonthlyChart } from '@/components/MonthlyChart'
import { generateMockTransactions } from '@/lib/mock-data'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SpendingBreakdownPage() {
  const transactions = generateMockTransactions(50)

  // Calculate category breakdown
  const categoryBreakdown = transactions.reduce((acc, transaction) => {
    if (transaction.amount < 0) { // Only expenses
      const category = transaction.category
      acc[category] = (acc[category] || 0) + Math.abs(transaction.amount)
    }
    return acc
  }, {} as Record<string, number>)

  const sortedCategories = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation />
      
      <PageLayout>
        
        <MainContent>
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Spending Breakdown</h2>
              <p className="text-muted-foreground">Detailed analysis of your spending patterns</p>
            </div>
            
            <SpendingChart transactions={transactions} />
            
            <MonthlyChart 
              transactions={transactions}
              title="Monthly Spending Trend"
              type="spending"
              displayMonths={12}
            />
          </div>
        </MainContent>
        
        <SideContent>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>Your highest spending categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedCategories.map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm font-medium">{category}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ${amount.toFixed(2)}
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