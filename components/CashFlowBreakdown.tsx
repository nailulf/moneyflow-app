'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { useCategories } from '@/contexts/CategoryContext'
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
import { CATEGORIES, CATEGORY_COLORS, Category } from '@/types/app'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface BudgetCategory {
  id: string
  category: string
  budgetAmount: number
  spentAmount: number
  color: string
  status: 'good' | 'warning' | 'over'
}

interface Budget {
  id: string
  name: string
  totalAmount: number
  period: 'monthly' | 'yearly'
  categories: BudgetCategory[]
}

interface CashFlowBreakdownProps {
  transactions: Transaction[]
  budgets: Budget[]
}

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

// // Mock budget data for demonstration
// const mockBudgets: Budget[] = [
//   {
//     id: '1',
//     name: 'Monthly Budget',
//     totalAmount: 3000,
//     period: 'monthly',
//     categories: [
//       { id: '1', category: 'Food & Dining', budgetAmount: 600, spentAmount: 450, color: CATEGORY_COLORS['Food & Dining'], status: calculateBudgetStatus(450, 600) },
//       { id: '2', category: 'Transportation', budgetAmount: 300, spentAmount: 280, color: CATEGORY_COLORS['Transportation'], status: calculateBudgetStatus(280, 300) },
//       { id: '3', category: 'Entertainment', budgetAmount: 200, spentAmount: 150, color: CATEGORY_COLORS['Entertainment'], status: calculateBudgetStatus(150, 200) },
//       { id: '4', category: 'Shopping', budgetAmount: 400, spentAmount: 520, color: CATEGORY_COLORS['Shopping'], status: calculateBudgetStatus(520, 400) },
//       { id: '5', category: 'Bills & Utilities', budgetAmount: 800, spentAmount: 750, color: CATEGORY_COLORS['Bills & Utilities'], status: calculateBudgetStatus(750, 800) },
//       { id: '6', category: 'Healthcare', budgetAmount: 200, spentAmount: 120, color: CATEGORY_COLORS['Healthcare'], status: calculateBudgetStatus(120, 200) },
//       { id: '7', category: 'Other', budgetAmount: 500, spentAmount: 480, color: CATEGORY_COLORS['Other'], status: calculateBudgetStatus(480, 500) },
//     ]
//   }
// ]

export function CashFlowBreakdown({ transactions, budgets = [] }: CashFlowBreakdownProps) {
  const { getCategoryName, getCategoryColor } = useCategories()
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(budgets.length > 0 ? budgets[0] : null)
  const [viewBy, setViewBy] = useState<'category' | 'amount'>('category')

  // Update selectedBudget when budgets prop changes
  useEffect(() => {
    if (budgets.length > 0 && !selectedBudget) {
      setSelectedBudget(budgets[0])
    } else if (budgets.length === 0) {
      setSelectedBudget(null)
    }
  }, [budgets, selectedBudget])

  // Filter transactions for current month
  const currentDate = new Date()
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  // console.log('🔍 CashFlowBreakdown Debug Info:')
  // console.log('📅 Current Date:', currentDate)
  // console.log('📅 Month Start:', monthStart)
  // console.log('📅 Month End:', monthEnd)
  // console.log('📊 Total Transactions:', transactions.length)
  
  const monthlyTransactions = transactions.filter(t => {
    const transactionDate = parseISO(t.date)
    return transactionDate >= monthStart && transactionDate <= monthEnd
  })
  
  // console.log('📊 Monthly Transactions:', monthlyTransactions.length)
  // console.log('📊 Monthly Transactions Data:', monthlyTransactions)

  // Calculate income breakdown for current month
  const incomeTransactions = monthlyTransactions.filter(t => t.type === 'INCOME' && t.amount > 0)
  // console.log('💰 Income Transactions:', incomeTransactions.length)
  // console.log('💰 Income Transactions Data:', incomeTransactions)
  
  const incomeByCategory = incomeTransactions.reduce((acc, transaction) => {
    const category = getCategoryName(transaction.category_id) || 'Other'
    const color = getCategoryColor(transaction.category_id) || '#4CAF50'
    const amount = Math.abs(transaction.amount)
    acc[category] = (acc[category] || 0) + transaction.amount
    return acc
  }, {} as Record<string, number>)
  
  // console.log('💰 Income By Category:', incomeByCategory)

  const incomeData = Object.entries(incomeByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: incomeTransactions.length > 0 ? (amount / incomeTransactions.reduce((sum, t) => sum + t.amount, 0)) * 100 : 0,
      color: getCategoryColor(incomeTransactions.find(t => getCategoryName(t.category_id) === category)?.category_id || '') || '#4CAF50'
    }))
    .sort((a, b) => b.amount - a.amount)

  const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0)
  // console.log('💰 Total Income:', totalIncome)
  // console.log('💰 Income Data:', incomeData)

  // Calculate expense breakdown for current month
  const expenseTransactions = monthlyTransactions.filter(t => t.type === 'EXPENSE')
  
  const expenseByCategory = expenseTransactions.reduce((acc, transaction) => {
    const category = getCategoryName(transaction.category_id) || 'Other'
    const color = getCategoryColor(transaction.category_id) || '#4CAF50'
    const amount = Math.abs(transaction.amount)
    acc[category] = (acc[category] || 0) + amount
    return acc
  }, {} as Record<string, number>)
  
  // console.log('💸 Expense By Category:', expenseByCategory)

  const expenseData = Object.entries(expenseByCategory)
    .map(([category, amount]) => ({
      category,
      amount: Math.abs(amount),
      percentage: expenseTransactions.length > 0 ? (Math.abs(amount) / expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)) * 100 : 0,
      color: getCategoryColor(expenseTransactions.find(t => getCategoryName(t.category_id) === category)?.category_id || '') || '#F44336'
    }))
    .sort((a, b) => b.amount - a.amount)

  const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0)
  
  // console.log('💸 Expense Data:', expenseData)
  // console.log('💸 Total Expenses:', totalExpenses)
  // console.log('💸 Expense Data Length:', expenseData.length)

  // Calculate budget breakdown
  const budgetData = selectedBudget?.categories.map(cat => ({
    category: cat.category,
    budgetAmount: cat.budgetAmount,
    spentAmount: cat.spentAmount,
    percentage: cat.budgetAmount > 0 ? (cat.spentAmount / cat.budgetAmount) * 100 : 0,
    color: cat.color,
    status: calculateBudgetStatus(cat.spentAmount, cat.budgetAmount)
  })) || []

  const totalBudget = selectedBudget?.totalAmount || 0
  const totalSpent = budgetData.reduce((sum, item) => sum + item.spentAmount, 0)
  
  console.log('💰 Budget Data:', budgetData)
  console.log('💰 Total Budget:', totalBudget)
  console.log('💰 Total Spent:', totalSpent)
  console.log('💰 Selected Budget:', selectedBudget)
  console.log('\n=== End CashFlowBreakdown Debug ===\n')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPieChart = (data: any[], dataKey: string, nameKey: string) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      )
    }

    const chartData = data.map((item, index) => ({
      ...item,
      fill: item.color || `hsl(var(--chart-${(index % 12) + 1}))`,
    }))

    return (
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey={dataKey}
            nameKey={nameKey}
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => [
                  formatCurrency(Number(value)),
                  name,
                ]}
              />
            }
          />
          <ChartLegend content={({ payload }) => <ChartLegendContent payload={payload as { dataKey?: string; name?: string; value?: number; color?: string; payload?: Record<string, unknown>; }[]} />} />
        </PieChart>
      </ChartContainer>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCategoryList = (data: any[], type: 'expense' | 'budget' | 'income') => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No {type} data available
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = type === 'budget' ? item.percentage : item.percentage
          const amount = type === 'budget' ? item.spentAmount : item.amount
          const budgetAmount = type === 'budget' ? item.budgetAmount : undefined
          
          return (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <span className="font-medium text-sm">{item.category}</span>
                  {type === 'budget' && (
                    <div className="text-xs text-gray-500">
                      {formatCurrency(amount)} of {formatCurrency(budgetAmount)}
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
                      variant={item.status === 'over' ? 'destructive' : item.status === 'warning' ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {item.status === 'over' ? 'Over' : item.status === 'warning' ? 'Warning' : 'Good'}
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
              {/* Budget Overview Section */}
              <div className="flex flex-col items-center space-y-4">
                {/* Circular Progress */}
                <div className="relative w-48 h-48">
                  <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={totalSpent > totalBudget ? "#ef4444" : totalSpent > totalBudget * 0.8 ? "#f59e0b" : "#10b981"}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${Math.min((totalSpent / totalBudget) * 251.2, 251.2)} 251.2`}
                      strokeLinecap="round"
                      className="transition-all duration-500 ease-in-out"
                    />
                  </svg>
                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`text-sm mb-1 ${
                      totalSpent > totalBudget ? 'text-red-600' : 
                      totalSpent > totalBudget * 0.8 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {((totalSpent / totalBudget) * 100).toFixed(1)}%
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {formatCurrency(totalSpent)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatCurrency(totalBudget)} budget
                    </div>
                  </div>
                </div>
                
                {/* Budget Status Summary */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-lg font-bold text-green-700">
                      {budgetData.filter(item => item.status === 'good').length}
                    </div>
                    <div className="text-xs text-green-600">On Track</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-lg font-bold text-amber-700">
                      {budgetData.filter(item => item.status === 'warning').length}
                    </div>
                    <div className="text-xs text-amber-600">Warning</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-lg font-bold text-red-700">
                      {budgetData.filter(item => item.status === 'over').length}
                    </div>
                    <div className="text-xs text-red-600">Over Budget</div>
                  </div>
                </div>
                
                {/* Overall Budget Status */}
                <div className={`p-4 rounded-lg border-2 ${
                  totalSpent > totalBudget ? 'bg-red-50 border-red-200' :
                  totalSpent > totalBudget * 0.8 ? 'bg-amber-50 border-amber-200' :
                  'bg-green-50 border-green-200'
                }`}>
                  <div className="text-center">
                    <div className={`text-lg font-semibold ${
                      totalSpent > totalBudget ? 'text-red-700' :
                      totalSpent > totalBudget * 0.8 ? 'text-amber-700' :
                      'text-green-700'
                    }`}>
                      {totalSpent > totalBudget ? '⚠️ Over Budget' :
                       totalSpent > totalBudget * 0.8 ? '⚡ Approaching Limit' :
                       '✅ Within Budget'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {totalSpent > totalBudget ? 
                        `${formatCurrency(totalSpent - totalBudget)} over budget` :
                        `${formatCurrency(totalBudget - totalSpent)} remaining`
                      }
                    </div>
                  </div>
                </div>
                
                {/* Edit Budget Button */}
                <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
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
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-4 pb-2 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-600">Category & group</div>
                  <div className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                    <span>Amount spent & upcoming</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                    <span>Budget</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                    <span>Available</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                </div>

                {/* Table Rows */}
                <div className="space-y-3">
                  {budgetData.map((item, index) => {
                    const progressPercentage = (item.spentAmount / item.budgetAmount) * 100
                    const available = item.budgetAmount - item.spentAmount
                    const variance = item.spentAmount - item.budgetAmount
                    const variancePercentage = ((variance / item.budgetAmount) * 100)
                    
                    return (
                      <div key={index} className={`grid grid-cols-4 gap-4 py-4 px-4 items-center rounded-lg border-l-4 ${
                        item.status === 'over' ? 'border-l-red-500 bg-red-50' :
                        item.status === 'warning' ? 'border-l-amber-500 bg-amber-50' :
                        'border-l-green-500 bg-green-50'
                      }`}>
                        {/* Category */}
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: item.color + '20' }}>
                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: item.color }}></div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{item.category}</span>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant={item.status === 'over' ? 'destructive' : item.status === 'warning' ? 'secondary' : 'default'}
                                className="text-xs"
                              >
                                {item.status === 'over' ? '🔴 Over' : item.status === 'warning' ? '🟡 Warning' : '🟢 Good'}
                              </Badge>
                              {variance !== 0 && (
                                <span className={`text-xs font-medium ${
                                  variance > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {variance > 0 ? '+' : ''}{variancePercentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Amount Spent with Enhanced Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900">{formatCurrency(item.spentAmount)}</span>
                            <span className="text-xs text-gray-500">
                              {progressPercentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="relative">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className="h-3 rounded-full transition-all duration-300 relative"
                                style={{ 
                                  width: `${Math.min(progressPercentage, 100)}%`,
                                  backgroundColor: 
                                    progressPercentage > 100 ? '#ef4444' : 
                                    progressPercentage > 80 ? '#f59e0b' : '#10b981'
                                }}
                              >
                                {progressPercentage > 100 && (
                                  <div className="absolute right-0 top-0 h-3 bg-red-600 rounded-r-full" 
                                       style={{ width: `${Math.min((progressPercentage - 100) * 2, 20)}px` }}>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Budget line indicator */}
                            <div className="absolute top-0 right-0 w-0.5 h-3 bg-gray-400"></div>
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
  )
}