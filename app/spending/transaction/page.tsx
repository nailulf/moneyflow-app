'use client'

import { TransactionTable } from '@/components/TransactionTable'
import { AddTransactionButton } from '@/components/AddTransactionButton'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionManager } from '@/hooks/use-transaction-manager'
import { CategoryManager } from '@/components/CategoryManager'

export default function SpendingTransactionPage() {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
  
  const { transactions, addTransaction } = useTransactionManager({
    userId: TEST_USER_ID
  })

  // Filter for expenses only
  const expenses = transactions.filter(t => t.type === 'EXPENSE')
  const recentExpenses = expenses.slice(0, 5)
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation actionButton={<CategoryManager userId={TEST_USER_ID} />} />
      
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <TransactionTable 
              transactions={transactions}
            />
          </div>
        </MainContent>
        
        <SideContent>
          <div className="space-y-4">
            <div>
              <AddTransactionButton onTransactionAdded={addTransaction} />
            </div>
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
                        <p className="text-xs text-muted-foreground">{transaction.category_id || 'Uncategorized'}</p>
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
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}