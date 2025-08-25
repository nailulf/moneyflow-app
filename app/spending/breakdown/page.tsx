'use client'

import React from 'react'
import { CashFlowBreakdown } from '@/components/CashFlowBreakdown'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, TopContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactions } from '@/contexts/TransactionContext'
import { getMonthlySpending, getMonthlyIncome, getCategoryBreakdown, formatCurrency } from '@/lib/data-utils'
import { useBudgetManager } from '@/hooks/use-budget-manager'
// Simple progress component inline
const Progress = ({ value = 0, className = '' }: { value?: number; className?: string }) => {
  const percentage = Math.min(Math.max(value, 0), 100)
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800 ${className}`}>
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
import { TrendingUp, TrendingDown } from 'lucide-react'
import { CATEGORY_COLORS } from '@/types/app'
import { CategoryManager } from '@/components/CategoryManager'

// Mock budget data
interface BudgetCategory {
  id: string
  category: string
  budgetAmount: number
  spentAmount: number
  color: string
}

interface Budget {
  id: string
  name: string
  totalAmount: number
  period: 'monthly' | 'yearly'
  categories: BudgetCategory[]
}

const mockBudgets: Budget[] = [
  {
    id: '1',
    name: 'Monthly Budget',
    totalAmount: 3000,
    period: 'monthly',
    categories: [
      { id: '1', category: 'Food & Dining', budgetAmount: 600, spentAmount: 450, color: CATEGORY_COLORS['Food & Dining'] },
      { id: '2', category: 'Transportation', budgetAmount: 300, spentAmount: 280, color: CATEGORY_COLORS['Transportation'] },
      { id: '3', category: 'Entertainment', budgetAmount: 200, spentAmount: 150, color: CATEGORY_COLORS['Entertainment'] },
      { id: '4', category: 'Shopping', budgetAmount: 400, spentAmount: 520, color: CATEGORY_COLORS['Shopping'] },
      { id: '5', category: 'Bills & Utilities', budgetAmount: 800, spentAmount: 750, color: CATEGORY_COLORS['Bills & Utilities'] },
    ]
  }
]

export default function BudgetingBreakdownPage() {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!
  
  const { 
    selectedBudget
  } = useBudgetManager({ initialBudgets: mockBudgets })
  
  const { transactions, loading, error } = useTransactions()
  
  const displayTransactions = transactions

  // Calculate monthly financial metrics
  const currentDate = new Date()
  const monthlyIncome = getMonthlyIncome(displayTransactions, currentDate)
  const monthlySpending = getMonthlySpending(displayTransactions, currentDate)
  const netCashFlow = monthlyIncome - monthlySpending

  // Calculate category breakdown for the current month
  const categoryBreakdownData = getCategoryBreakdown(displayTransactions)
  const sortedCategories = categoryBreakdownData
    .slice(0, 10)
    .map(item => [item.category, item.amount] as [string, number])

  // Calculate budget overview
  const totalBudget = selectedBudget?.totalAmount || 0
  const totalSpent = selectedBudget?.categories.reduce((sum, cat) => sum + cat.spentAmount, 0) || 0



  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation actionButton={<CategoryManager userId={TEST_USER_ID} />} />
      
      <PageLayout>
        <TopContent>
           {/* Header */}
            <div className="flex items-center justify-between">
              <div className='mb-4'>
                <h2 className="text-xl font-semibold tracking-tight mb-2">Budgeting & Breakdown</h2>
                <p className="text-muted-foreground">Manage your budgets and analyze spending patterns</p>
              </div>
            </div>
            {/* Budget Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Income</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyIncome)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(monthlySpending)}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Net Cash Flow</p>
                      <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(netCashFlow)}
                      </p>
                    </div>
                    {netCashFlow >= 0 ? 
                      <TrendingUp className="h-8 w-8 text-green-600" /> : 
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    }
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Budget Remaining</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalBudget - totalSpent)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">of {formatCurrency(totalBudget)}</p>
                      <Progress value={(totalSpent / totalBudget) * 100} className="w-16 h-2 mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
        </TopContent>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            {/* Cash Flow Breakdown with Tabs */}
            <CashFlowBreakdown transactions={transactions} />
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
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#AED6F1' }}
                        />
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
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Use the budget manager above to create and manage your budgets.
                </p>
              </CardContent>
            </Card>
          </div>
        </SideContent>
        </ContentWrapper>
        
      </PageLayout>
    </div>
  )
}