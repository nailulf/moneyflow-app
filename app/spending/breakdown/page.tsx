'use client'

import React, { useState, useEffect } from 'react'
import { CashFlowBreakdown } from '@/components/CashFlowBreakdown'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, TopContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactions } from '@/contexts/TransactionContext'
import { formatCurrency } from '@/lib/data-utils'
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions'
import { calculateBudgetProgress, calculateTotalSpent } from '@/lib/budget-utils'
import { BudgetCreationModal } from '@/components/BudgetCreationSheet'
import { BudgetFilterBar } from '@/components/BudgetFilterBar'
import { useCategories } from '@/contexts/CategoryContext'
import { BudgetProvider, useBudgets } from '@/contexts/BudgetContext'
// Simple progress component inline
const Progress = ({ value = 0, className = '' }: { value?: number; className?: string }) => {
  const percentage = Math.min(Math.max(value, 0), 100)
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
import { TrendingUp, TrendingDown } from 'lucide-react'


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
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  
  // Initialize date state - default to current date but allow hydration to settle
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [selectedMonth, setSelectedMonth] = useState<number>(1)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Set current date on mount to ensure correct local time
  useEffect(() => {
    const now = new Date()
    setSelectedYear(now.getFullYear())
    setSelectedMonth(now.getMonth() + 1)
    setIsInitialized(true)
  }, [])

  const [timeRange, setTimeRange] = useState<'monthly' | 'yearly'>('monthly')
  
  // Use global budget context
  const { 
    budgets, 
    selectedBudget, 
    loading: budgetLoading,
    fetchBudgets,
    selectBudget: setSelectedBudget
  } = useBudgets()

  // Sync context with local date selection
  useEffect(() => {
    if (isInitialized) {
      fetchBudgets(selectedYear, selectedMonth)
    }
  }, [selectedYear, selectedMonth, isInitialized, fetchBudgets])
  
  const { transactions, loading, error } = useTransactions()
  const { categories } = useCategories()

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
    netCashFlow
  } = useFilteredTransactions(transactions, timeRange, selectedYear, selectedMonth)

  const handleBudgetCreated = () => {
    setIsBudgetModalOpen(false)
    fetchBudgets(selectedYear, selectedMonth)
  }

  // Calculate budget overview
  const totalBudget = selectedBudget?.total_amount || 0
  const totalSpent = selectedBudget?.budget_categories?.reduce((sum, cat) => sum + cat.spent_amount, 0) || 0
  const budgetProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation />
      
      <PageLayout>
        <TopContent>
           {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight mb-1">Budgeting & Breakdown</h2>
                <p className="text-sm text-muted-foreground">Manage your budgets and analyze spending patterns</p>
              </div>
              <BudgetFilterBar
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                selectedBudgetName={selectedBudget?.name}
                onCreateBudget={() => setIsBudgetModalOpen(true)}
              />
            </div>
            {/* Budget Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{timeRange === 'monthly' ? 'Monthly' : 'Avg Monthly'} Income</p>
                      <p className="text-2xl font-bold text-success">{formatCurrency(monthlyIncome)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{timeRange === 'monthly' ? 'Monthly' : 'Avg Monthly'} Expenses</p>
                      <p className="text-2xl font-bold text-destructive">{formatCurrency(monthlySpending)}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{timeRange === 'monthly' ? 'Monthly' : 'Avg Monthly'} Net Cash Flow</p>
                      <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(netCashFlow)}
                      </p>
                    </div>
                    {netCashFlow >= 0 ? 
                      <TrendingUp className="h-8 w-8 text-success" /> : 
                      <TrendingDown className="h-8 w-8 text-destructive" />
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
                        budgetProgress > 100 ? 'text-destructive' : 
                        budgetProgress > 80 ? 'text-warning' : 'text-success'
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
                        <p className="text-xs text-destructive mt-1">Over budget!</p>
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
              <CashFlowBreakdown 
                transactions={filteredTransactions}
              />
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
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(selectedBudget.total_amount)}
                        </div>
                        <div className="text-sm text-primary">Total Budget</div>
                      </div>
                      <div className="text-center p-4 bg-success/10 rounded-lg">
                         <div className="text-2xl font-bold text-success">
                           {formatCurrency(
                             (selectedBudget.budget_categories || []).reduce((sum: number, bc) => 
                               sum + (filteredTransactions
                                 .filter(t => t.amount < 0 && t.category_id === bc.category?.id)
                                 .reduce((catSum, t) => catSum + Math.abs(t.amount), 0)
                               ), 0)
                           )}
                         </div>
                         <div className="text-sm text-success">Total Spent</div>
                       </div>
                     </div>
                     
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span>Overall Progress</span>
                         <span>
                           {calculateBudgetProgress(
                             (selectedBudget.budget_categories || []).reduce((sum: number, bc) => 
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
                             (selectedBudget.budget_categories || []).reduce((sum: number, bc) => 
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
                  <div className="text-center py-6 text-muted-foreground">
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
      />
    </div>
  )
}