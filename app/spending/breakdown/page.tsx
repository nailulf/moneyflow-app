'use client'

import React, { useState, useEffect } from 'react'
import { CashFlowBreakdown } from '@/components/CashFlowBreakdown'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, TopContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTransactions } from '@/contexts/TransactionContext'
import { formatCurrency } from '@/lib/data-utils'
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions'
import { calculateBudgetProgress, calculateTotalSpent } from '@/lib/budget-utils'
import { BudgetCreationModal } from '@/components/BudgetCreationSheet'
import { useCategories } from '@/contexts/CategoryContext'
import { BudgetProvider } from '@/contexts/BudgetContext'
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
import { TrendingUp, TrendingDown, Plus, Target, Calendar } from 'lucide-react'
import { CategoryManager } from '@/components/CategoryManager'
import { AccountManager } from '@/components/AccountManager'
import { AccountProvider } from '@/contexts/AccountContext'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Real budget data interfaces
interface Budget {
  id: string
  name: string
  total_amount: number
  period: 'monthly' | 'yearly'
  year: number
  month?: number
  currency: string
  is_active: boolean
  budget_categories: {
    id: string
    allocated_amount: number
    spent_amount: number
    category: {
      id: string
      name: string
      color: string
    }
  }[]
}

export default function BudgetingBreakdownPage() {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!
  
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(2025) // Set to 2025 where we have budget data
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [timeRange, setTimeRange] = useState<'monthly' | 'yearly'>('monthly')
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(true)
  
  const { transactions, loading, error } = useTransactions()
  const { categories } = useCategories()

  // Handle budgets loaded from ClientBudgetFetcher
  const handleBudgetsLoaded = (loadedBudgets: Budget[]) => {
    setBudgets(loadedBudgets)
    setBudgetLoading(false)
    
    // Auto-select the first budget if none selected
    if (loadedBudgets.length > 0 && !selectedBudget) {
      setSelectedBudget(loadedBudgets[0])
    }
  }

  const refetchBudgets = () => {
     setBudgetLoading(true)
     // The ClientBudgetFetcher will handle refetching
   }

   // Transform budgets for CashFlowBreakdown component
   const transformedBudgets = budgets.map(budget => ({
     id: budget.id,
     name: budget.name,
     totalAmount: budget.total_amount,
     period: budget.period,
     categories: budget.budget_categories?.map(bc => ({
       id: bc.id,
       category: bc.category?.name || 'Unknown',
       budgetAmount: bc.allocated_amount,
       spentAmount: bc.spent_amount,
       color: bc.category.color,
       status: (bc.spent_amount / bc.allocated_amount > 1 ? 'over' : 
                bc.spent_amount / bc.allocated_amount > 0.8 ? 'warning' : 'good') as 'good' | 'warning' | 'over'
     }))
   }))

  // Filter transactions based on time range
  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date)
    const transactionYear = transactionDate.getFullYear()
    const transactionMonth = transactionDate.getMonth() + 1

    if (timeRange === 'yearly') {
      return transactionYear === selectedYear
    } else {
      return transactionYear === selectedYear && transactionMonth === selectedMonth
    }
  })

  const {
    monthlyIncome,
    monthlySpending,
    netCashFlow  } = useFilteredTransactions(transactions, timeRange, selectedYear, selectedMonth)

  const handleBudgetCreated = (budget: Budget) => {
    refetchBudgets()
    setSelectedBudget(budget)
    setIsBudgetModalOpen(false)
    toast.success('Budget created successfully!')
  }

  // Calculate budget overview
  const totalBudget = selectedBudget?.total_amount || 0
  const totalSpent = selectedBudget?.budget_categories.reduce((sum, cat) => sum + cat.spent_amount, 0) || 0
  const budgetProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation actionButton={
          <div className="flex items-center gap-2">
            <CategoryManager userId={TEST_USER_ID} />
            <AccountProvider userId={TEST_USER_ID}>
              <AccountManager userId={TEST_USER_ID} />
            </AccountProvider>
          </div>
        } />
      
      <PageLayout>
        <TopContent>
           {/* Header */}
            <div className="flex items-center justify-between">
              <div className='mb-4'>
                <h2 className="text-xl font-semibold tracking-tight mb-2">Budgeting & Breakdown</h2>
                <p className="text-muted-foreground">Manage your budgets and analyze spending patterns</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Time Range Selector */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Select value={timeRange} onValueChange={(value: 'monthly' | 'yearly') => setTimeRange(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {timeRange === 'monthly' && (
                    <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <SelectItem key={month} value={month.toString()}>
                            {new Date(0, month - 1).toLocaleString('default', { month: 'short' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                {selectedBudget && (
                  <Badge variant="outline" className="flex items-center gap-2">
                    <Target className="h-3 w-3" />
                    {selectedBudget.name}
                  </Badge>
                )}
                <Button onClick={() => setIsBudgetModalOpen(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Budget
                </Button>
              </div>
            </div>
            {/* Budget Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{timeRange === 'monthly' ? 'Monthly' : 'Avg Monthly'} Income</p>
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
                      <p className="text-sm text-muted-foreground">{timeRange === 'monthly' ? 'Monthly' : 'Avg Monthly'} Expenses</p>
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
                      <p className="text-sm text-muted-foreground">{timeRange === 'monthly' ? 'Monthly' : 'Avg Monthly'} Net Cash Flow</p>
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
                      <p className="text-sm text-muted-foreground">Budget Status</p>
                      <p className={`text-2xl font-bold ${
                        budgetProgress > 100 ? 'text-red-600' : 
                        budgetProgress > 80 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(totalBudget - totalSpent)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {budgetProgress.toFixed(1)}% used
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">of {formatCurrency(totalBudget)}</p>
                      <Progress value={budgetProgress} className="w-16 h-2 mt-1" />
                      {budgetProgress > 100 && (
                        <p className="text-xs text-red-600 mt-1">Over budget!</p>
                      )}
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
            <BudgetProvider userId={TEST_USER_ID} year={selectedYear} month={selectedMonth}>
              <CashFlowBreakdown 
                transactions={filteredTransactions}
              />
            </BudgetProvider>
          </div>
        </MainContent>
        
        <SideContent>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Overview</CardTitle>
                <CardDescription>
                  {selectedBudget ? `${selectedBudget.name} - ${timeRange === 'monthly' ? 'Monthly' : 'Yearly'} Budget` : 'No budget selected'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedBudget ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(selectedBudget.total_amount)}
                        </div>
                        <div className="text-sm text-blue-600">Total Budget</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                         <div className="text-2xl font-bold text-green-600">
                           {formatCurrency(
                             selectedBudget.budget_categories.reduce((sum: number, bc) => 
                               sum + (filteredTransactions
                                 .filter(t => t.amount < 0 && t.category_id === bc.category?.id)
                                 .reduce((catSum, t) => catSum + Math.abs(t.amount), 0)
                               ), 0)
                           )}
                         </div>
                         <div className="text-sm text-green-600">Total Spent</div>
                       </div>
                     </div>
                     
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span>Overall Progress</span>
                         <span>
                           {calculateBudgetProgress(
                             selectedBudget.budget_categories.reduce((sum: number, bc) => 
                               sum + (filteredTransactions
                                 .filter(t => t.amount < 0 && t.category_id === bc.category?.id)
                                 .reduce((catSum, t) => catSum + Math.abs(t.amount), 0)
                               ), 0),
                             selectedBudget.total_amount
                           ).toFixed(1)}%
                         </span>
                       </div>
                       <Progress 
                         value={Math.min(
                           calculateBudgetProgress(
                             selectedBudget.budget_categories.reduce((sum: number, bc) => 
                               sum + (filteredTransactions
                                 .filter(t => t.amount < 0 && t.category_id === bc.category?.id)
                                 .reduce((catSum, t) => catSum + Math.abs(t.amount), 0)
                               ), 0),
                             selectedBudget.total_amount
                           ),
                           100
                         )}
                         className="h-2"
                       />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>No budget selected</p>
                    <p className="text-sm mt-1">Select a budget to see overview</p>
                  </div>
                )}
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
      
      <BudgetCreationModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onBudgetCreated={handleBudgetCreated}
        categories={categories}
        userId={TEST_USER_ID}
      />
    </div>
  )
}