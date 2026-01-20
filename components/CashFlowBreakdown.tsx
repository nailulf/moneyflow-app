'use client'

import { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '@/lib/data-utils'
import { useCategories } from '@/contexts/CategoryContext'
import { useBudgets } from '@/contexts/BudgetContext'
import { startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { CATEGORIES, CashFlowBreakdownProps } from '@/types/app'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { TransformedBudget } from '@/contexts/BudgetContext'
import { BudgetEditSheet } from '@/components/BudgetEditSheet'
import { toast } from 'sonner'
import { createCategory } from '@/lib/api/categories'
import { getUserCategoryGroups } from '@/lib/api/category-groups'
import { CategoryInsert, CategoryDB } from '@/types/database'

const chartConfig = {
  amount: {
    label: "Amount",
  },
  ...Object.fromEntries(
    CATEGORIES.map((category, index) => [
      category.toLowerCase().replace(/[^a-z0-9]/g, ''),
      {
        label: category,
        color: `hsl(var(--chart-${(index % 12) + 1}))`,
      },
    ])
  ),
} satisfies ChartConfig

// Helper function to calculate budget status
const calculateBudgetStatus = (spentAmount: number, budgetAmount: number): 'good' | 'warning' | 'over' => {
  const percentage = (spentAmount / budgetAmount) * 100
  if (percentage > 100) return 'over'
  if (percentage > 80) return 'warning'
  return 'good'
}

export function CashFlowBreakdown({ transactions }: CashFlowBreakdownProps) {
  const [viewBy, setViewBy] = useState<'category' | 'amount'>('category')
  const [budgetItemsLoading, setBudgetItemsLoading] = useState(false)
  const [budgetItemsError, setBudgetItemsError] = useState<string | null>(null)
  const [isBudgetEditOpen, setIsBudgetEditOpen] = useState(false)
  const { getCategoryName, getCategoryColor, categories, refreshCategories } = useCategories()
  const { transformedBudgets, selectedBudget, selectBudget, loading: budgetLoading, error: budgetError, getBudgetItems, updateBudgetWithCategories, refreshBudgets } = useBudgets()

  // Use the filtered transactions passed as props
  // This allows the component to respect the month/year filter from the parent
  const filteredTransactions = transactions

  // Find the selected transformed budget for calculations
  const selectedTransformedBudget = transformedBudgets.find(b => b.id === selectedBudget?.id)

  // Calculate budget data from selected budget with proper type safety
  const budgetData = selectedTransformedBudget?.categories || []
  const totalBudget = budgetData.reduce((sum: number, item) => sum + (item.budgetAmount || 0), 0)
  const totalSpent = budgetData.reduce((sum: number, item) => sum + (item.spentAmount || 0), 0)

  // Calculate expense data
  const expenseTransactions = filteredTransactions.filter(t => t.amount !== 0 && t.type === 'EXPENSE')
  interface CategoryData {
    category: string
    amount: number
    color: string
  }

  const expensesByCategory = expenseTransactions.reduce((acc, transaction) => {
    const categoryName = getCategoryName(transaction.category_id) || 'Other'
    const amount = Math.abs(transaction.amount)
    
    if (!acc[categoryName]) {
      acc[categoryName] = {
        category: categoryName,
        amount: 0,
        color: getCategoryColor(transaction.category_id) || '#8884d8'
      }
    }
    acc[categoryName].amount += amount
    return acc
  }, {} as Record<string, CategoryData>)

  interface CategoryDataWithPercentage extends CategoryData {
    percentage: number
  }

  type BudgetCategoryData = TransformedBudget['categories'][0] & {
    percentage: number
  }

  const expenseDataArray = Object.values(expensesByCategory)
    .sort((a, b) => viewBy === 'amount' ? b.amount - a.amount : a.category.localeCompare(b.category))
  
  const totalExpenseAmount = expenseDataArray.reduce((sum: number, item: CategoryData) => sum + item.amount, 0)
  
  const expenseData: CategoryDataWithPercentage[] = expenseDataArray.map((item: CategoryData) => ({
    ...item,
    percentage: totalExpenseAmount > 0 ? (item.amount / totalExpenseAmount) * 100 : 0
  }))

  const totalExpenses = expenseData.reduce((sum: number, item: CategoryDataWithPercentage) => sum + item.amount, 0)

  // Calculate income data
  const incomeTransactions = filteredTransactions.filter(t => t.amount > 0 && t.type === 'INCOME')
  const incomeByCategory = incomeTransactions.reduce((acc, transaction) => {
    const categoryName = getCategoryName(transaction.category_id) || 'Other'
    const amount = transaction.amount
    
    if (!acc[categoryName]) {
      acc[categoryName] = {
        category: categoryName,
        amount: 0,
        color: getCategoryColor(transaction.category_id) || '#82ca9d'
      }
    }
    acc[categoryName].amount += amount
    return acc
  }, {} as Record<string, CategoryData>)

  const incomeDataArray = Object.values(incomeByCategory)
    .sort((a, b) => viewBy === 'amount' ? b.amount - a.amount : a.category.localeCompare(b.category))
  
  const totalIncomeAmount = incomeDataArray.reduce((sum: number, item: CategoryData) => sum + item.amount, 0)
  
  const incomeData: CategoryDataWithPercentage[] = incomeDataArray.map((item: CategoryData) => ({
    ...item,
    percentage: totalIncomeAmount > 0 ? (item.amount / totalIncomeAmount) * 100 : 0
  }))

  const totalIncome = incomeData.reduce((sum: number, item: CategoryDataWithPercentage) => sum + item.amount, 0)
  
  // Enhanced budget data with real transaction amounts -> calculating spentAmount
  const enhancedBudgetData = budgetData.map(item => {
    // Get actual spent amount from expensesByCategory using category name
    const categoryExpense = expensesByCategory[item.category]
    const actualSpent = categoryExpense ? categoryExpense.amount : 0
    const budgetAmount = item.budgetAmount || 0
    const status = calculateBudgetStatus(actualSpent, budgetAmount)
  
    return {
      ...item,
      spentAmount: actualSpent,
      status,
      percentage: budgetAmount > 0 ? (actualSpent / budgetAmount) * 100 : 0
    }
  })

  const actualTotalSpent = enhancedBudgetData.reduce((sum, item) => sum + item.spentAmount, 0)

  // Handle budget items fetching with error handling
  const handleBudgetItemsFetch = useCallback(async (budgetId: string) => {
    if (!budgetId) return
    
    setBudgetItemsLoading(true)
    setBudgetItemsError(null)
    
    try {
      await getBudgetItems(budgetId)
    } catch (error) {
      setBudgetItemsError(error instanceof Error ? error.message : 'Failed to fetch budget items')
    } finally {
      setBudgetItemsLoading(false)
    }
  }, [getBudgetItems])

  // Fetch budget items when selected budget changes
  useEffect(() => {
    if (selectedBudget?.id) {
      handleBudgetItemsFetch(selectedBudget.id)
    }
  }, [selectedBudget?.id, handleBudgetItemsFetch])

  const renderPieChart = (data: CategoryDataWithPercentage[], dataKey: string, nameKey: string) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No data available</p>
        </div>
      )
    }

    return (
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            innerRadius={60}
            strokeWidth={5}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <ChartLegend
            content={<ChartLegendContent nameKey={nameKey} />}
            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
          />
        </PieChart>
      </ChartContainer>
    )
  }

  const renderCategoryList = (data: CategoryDataWithPercentage[] | BudgetCategoryData[], type: 'expense' | 'income' | 'budget') => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <p>No {type} data available</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = item.percentage
          const amount = type === 'budget' ? (item as BudgetCategoryData).spentAmount : (item as CategoryDataWithPercentage).amount
          const budgetAmount = type === 'budget' ? (item as BudgetCategoryData).budgetAmount : undefined
          
          return (
            <div key={item.category} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <span className="font-medium text-sm">{item.category}</span>
                  {type === 'budget' && (
                    <div className="text-xs text-gray-500">
                      {formatCurrency(amount)} of {formatCurrency(budgetAmount || 0)}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm">
                  {formatCurrency(amount)}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {percentage.toFixed(1)}%
                  </span>
                  {type === 'budget' && (
                    <Badge 
                      variant={(item as BudgetCategoryData).status === 'over' ? 'destructive' : (item as BudgetCategoryData).status === 'warning' ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {(item as BudgetCategoryData).status === 'over' ? 'Over' : (item as BudgetCategoryData).status === 'warning' ? 'Warning' : 'Good'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Cash Flow Breakdown</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">View by</span>
            <Select value={viewBy} onValueChange={(value: 'category' | 'amount') => setViewBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="expenses" className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4" />
              <span>Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Budget</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Income</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Expenses</h3>
                  <p className="text-sm text-gray-600">Total spending this month: {formatCurrency(totalExpenses)}</p>
                </div>
                {renderPieChart(expenseData, 'amount', 'category')}
              </div>
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Expenses Breakdown</h3>
                  <p className="text-sm text-gray-600">{expenseData.length} expense categories</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {renderCategoryList(expenseData, 'expense')}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="budget" className="mt-6">
            <div className="space-y-6">
              {/* Budget Selection */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Budget Overview</h3>
                  <p className="text-sm text-gray-600">
                    {budgetLoading ? 'Loading budgets...' : 
                     budgetError ? `Error: ${budgetError}` :
                     budgetItemsLoading ? 'Loading budget items...' :
                     budgetItemsError ? `Budget items error: ${budgetItemsError}` :
                     transformedBudgets.length === 0 ? 'No budgets available' :
                     `Showing ${selectedTransformedBudget?.name || 'budget'} for ${selectedTransformedBudget?.period || 'period'}`}
                  </p>
                </div>
                {transformedBudgets.length > 0 && (
                  <Select 
                    value={selectedBudget?.id || ''} 
                    onValueChange={(budgetId) => {
                      const budget = transformedBudgets.find(b => b.id === budgetId)
                      if (budget) {
                        selectBudget({
                          id: budget.id,
                          name: budget.name,
                          total_amount: budget.totalAmount,
                          period: budget.period,
                          year: new Date().getFullYear(),
                          month: new Date().getMonth() + 1,
                          currency: 'IDR',
                          is_active: true,
                          user_id: '',
                          created_at: '',
                          updated_at: ''
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a budget" />
                    </SelectTrigger>
                    <SelectContent>
                      {transformedBudgets.map((budget) => (
                        <SelectItem key={budget.id} value={budget.id}>
                          {budget.name} ({budget.period})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {/* Budget Overview Section */}
              {selectedTransformedBudget && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    {/* Circular Progress */}
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke={actualTotalSpent > totalBudget ? '#ef4444' : actualTotalSpent > totalBudget * 0.8 ? '#f59e0b' : '#10b981'}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${Math.min((actualTotalSpent / totalBudget) * 283, 283)} 283`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {totalBudget > 0 ? Math.round((actualTotalSpent / totalBudget) * 100) : 0}%
                        </div>
                        <div className="text-sm text-gray-500">of budget used</div>
                      </div>
                    </div>
                    
                    {/* Budget Overall Status Summary */}
                    <div className="text-center space-y-0">
                      <div className="flex items-center justify-center space-x-2">
                        <Badge 
                          variant={totalSpent > totalBudget ? 'destructive' : totalSpent > totalBudget * 0.8 ? 'secondary' : 'default'}
                          className="text-sm"
                        >
                          {totalSpent > totalBudget ? 'Over Budget' : totalSpent > totalBudget * 0.8 ? 'Near Limit' : 'On Track'}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatCurrency(Math.abs(totalBudget - totalSpent))} {totalSpent > totalBudget ? 'over' : 'remaining'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Edit Budget Button */}
                    <button 
                      onClick={() => setIsBudgetEditOpen(true)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                      disabled={!selectedBudget}
                    >
                      <span className="text-sm font-medium underline">EDIT BUDGET</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>

                  {/* View By Dropdown */}
                  <div className="flex justify-end">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">View by</span>
                      <Select value="category" onValueChange={() => {}}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="category">All budget items</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Budget Table */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                      <div>Category</div>
                      <div className="text-center">Spent</div>
                      <div className="text-center">Budget</div>
                      <div className="text-center">Available</div>
                    </div>
                    
                    {enhancedBudgetData.map((item, index) => {
                      const available = item.budgetAmount - item.spentAmount
                      const progressPercentage = Math.min((item.spentAmount / item.budgetAmount) * 100, 100)
                      
                      return (
                        <div key={item.category} className="grid grid-cols-4 gap-4 items-center py-3 border-b border-gray-100 last:border-b-0">
                          {/* Category */}
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <div>
                              <div className="font-medium text-sm">{item.category}</div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    item.status === 'over' ? 'bg-red-500' : 
                                    item.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${progressPercentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Spent */}
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(item.spentAmount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              vs {formatCurrency(item.budgetAmount)} budgeted
                            </div>
                          </div>
                          
                          {/* Budget */}
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(item.budgetAmount)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Target
                            </div>
                          </div>
                          
                          {/* Available/Variance */}
                          <div className="text-center">
                            <div className={`font-semibold ${
                              available < 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(Math.abs(available))}
                            </div>
                            <div className={`text-xs mt-1 ${
                              available < 0 ? 'text-red-500' : 'text-green-500'
                            }`}>
                              {available < 0 ? 'Over' : 'Remaining'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="income" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Income Sources</h3>
                  <p className="text-sm text-gray-600">Total income this month: {formatCurrency(totalIncome)}</p>
                </div>
                {renderPieChart(incomeData, 'amount', 'category')}
              </div>
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Income Breakdown</h3>
                  <p className="text-sm text-gray-600">{incomeData.length} income sources</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {renderCategoryList(incomeData, 'income')}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    
    {/* Budget Edit Sheet */}
    <BudgetEditSheet
      isOpen={isBudgetEditOpen}
      onClose={() => setIsBudgetEditOpen(false)}
      budgetData={selectedBudget ? {
        id: selectedBudget.id || '1',
        name: selectedBudget.name || 'Monthly Budget',
        totalAmount: selectedTransformedBudget?.totalAmount || 0,
        period: 'monthly' as const,
        categories: selectedTransformedBudget?.categories || []
      } : null}
      onSave={async (updatedBudget) => {
        try {
          if (!selectedBudget?.id) {
            toast.error('No budget selected for saving')
            return
          }

          const userId = process.env.NEXT_PUBLIC_TEST_USER_ID!
          
          // Validate budget data before processing
          if (!updatedBudget.categories || updatedBudget.categories.length === 0) {
            throw new Error('No budget categories provided')
          }
          
          if (updatedBudget.totalAmount <= 0) {
            throw new Error('Budget total amount must be greater than zero')
          }
          
          // Check if budget exceeds limit and handle "Others" category creation
          const totalAllocated = updatedBudget.categories.reduce((sum, cat) => {
            if (cat.budgetAmount < 0) {
              throw new Error(`Budget amount cannot be negative for category: ${cat.category}`)
            }
            return sum + cat.budgetAmount
          }, 0)
          const budgetExceedsLimit = totalAllocated > updatedBudget.totalAmount
          
          // Ensure all referenced categories exist (restore if deleted)
          const othersCategory = updatedBudget.categories.find(cat => cat.category === 'Others')
          const othersNeeded = budgetExceedsLimit || othersCategory
          
          // Find missing categories
          const missingCategories = updatedBudget.categories.filter(cat => 
            cat.category !== 'Others' && !categories.find(c => c.name === cat.category)
          )
          
          const othersMissing = othersNeeded && !categories.find(c => c.name === 'Others')
          
          // Map to store locally created categories (to avoid stale closure issues)
          const localCategories = new Map<string, CategoryDB>()
          
          if (missingCategories.length > 0 || othersMissing) {
            // Get expense category group for new categories
            const categoryGroups = await getUserCategoryGroups(userId)
            const expenseGroup = categoryGroups.find(group => group.type === 'EXPENSE')
            
            if (!expenseGroup) {
              throw new Error('No expense category group found')
            }
            
            // Restore missing categories
            for (const cat of missingCategories) {
              if (localCategories.has(cat.category)) continue

              const newCategory: CategoryInsert = {
                user_id: userId,
                name: cat.category,
                color: cat.color || '#cccccc',
                group_type: 'EXPENSE',
                category_group_id: expenseGroup.id,
                is_custom: true,
                is_active: true
              }
              
              try {
                const created = await createCategory(newCategory)
                localCategories.set(created.name, created)
                toast.success(`Restored category: ${cat.category}`)
              } catch (err) {
                console.error(`Failed to restore category ${cat.category}`, err)
              }
            }
            
            // Create Others if needed
            if (othersMissing && !localCategories.has('Others')) {
              const newOthersCategory: CategoryInsert = {
                user_id: userId,
                name: 'Others',
                color: '#AED6F1',
                group_type: 'EXPENSE',
                category_group_id: expenseGroup.id,
                is_custom: true,
                is_active: true
              }
              
              try {
                const created = await createCategory(newOthersCategory)
                localCategories.set('Others', created)
                toast.success('"Others" category created successfully')
              } catch (err) {
                console.error('Failed to create Others category', err)
              }
            }
            
            // Refresh categories context
            await refreshCategories()
          }
          
          let othersExists = categories.find(cat => cat.name === 'Others') || localCategories.get('Others')
          
          // If budget exceeds limit and no "Others" item exists, create it
          if (budgetExceedsLimit && !othersCategory) {
            const excessAmount = totalAllocated - updatedBudget.totalAmount
            updatedBudget.categories.push({
               id: '',
               category: 'Others',
               budgetAmount: excessAmount,
               spentAmount: 0,
               color: '#AED6F1',
               status: 'good' as const
             })
            
            // Update total budget amount to accommodate the excess
            updatedBudget.totalAmount = totalAllocated
          }

          // Transform BudgetEditData categories to BudgetCategoryDB format
          const budgetCategories = updatedBudget.categories.map(category => {
            // Find category ID by name (check global list, then local restored list)
            const categoryData = categories.find(cat => cat.name === category.category) || 
                               localCategories.get(category.category) ||
                               (category.category === 'Others' ? othersExists : null)
            
            if (!categoryData) {
              throw new Error(`Category not found: ${category.category}`)
            }

            return {
              id: category.id !== categoryData.id ? '' : category.id, // Empty ID for new categories
              budget_id: selectedBudget.id,
              category_id: categoryData.id,
              allocated_amount: category.budgetAmount,
              spent_amount: category.spentAmount,
              currency: 'IDR',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          })

          // Update budget with categories
          await updateBudgetWithCategories(
            selectedBudget.id,
            {
              name: updatedBudget.name,
              total_amount: updatedBudget.totalAmount,
              period: updatedBudget.period
            },
            budgetCategories
          )

          // Refresh budgets to get updated data
          await refreshBudgets()
          
          setIsBudgetEditOpen(false)
        } catch (error) {
          console.error('Error saving budget:', error)
          
          // Provide specific error messages for different scenarios
          let errorMessage = 'Unknown error occurred'
          
          if (error instanceof Error) {
            if (error.message.includes('Category not found')) {
              errorMessage = 'Failed to find or create required category. Please try again.'
            } else if (error.message.includes('No expense category group found')) {
              errorMessage = 'No expense category group found. Please contact support.'
            } else if (error.message.includes('budget')) {
              errorMessage = `Budget save failed: ${error.message}`
            } else {
              errorMessage = error.message
            }
          }
          
          toast.error(`Error saving budget: ${errorMessage}`)
          
          // If category creation failed, refresh categories to ensure consistency
          if (error instanceof Error && error.message.includes('Category')) {
            try {
              await refreshCategories()
            } catch (refreshError) {
              console.error('Failed to refresh categories:', refreshError)
            }
          }
          
          throw error // Let BudgetEditSheet handle the error display
        }
      }}
    />
    </>
  )
}