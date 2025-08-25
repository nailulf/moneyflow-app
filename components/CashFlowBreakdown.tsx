'use client'

import { useState } from 'react'
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
  budgets?: Budget[]
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

// Mock budget data for demonstration
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
      { id: '6', category: 'Healthcare', budgetAmount: 200, spentAmount: 120, color: CATEGORY_COLORS['Healthcare'] },
      { id: '7', category: 'Other', budgetAmount: 500, spentAmount: 480, color: CATEGORY_COLORS['Other'] },
    ]
  }
]

export function CashFlowBreakdown({ transactions, budgets = mockBudgets }: CashFlowBreakdownProps) {
  const { getCategoryName, getCategoryColor } = useCategories()
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(budgets[0] || null)
  const [viewBy, setViewBy] = useState<'category' | 'amount'>('category')

  // Filter transactions for current month
  const currentDate = new Date()
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  console.log('🔍 CashFlowBreakdown Debug Info:')
  console.log('📅 Current Date:', currentDate)
  console.log('📅 Month Start:', monthStart)
  console.log('📅 Month End:', monthEnd)
  console.log('📊 Total Transactions:', transactions.length)
  
  const monthlyTransactions = transactions.filter(t => {
    const transactionDate = parseISO(t.date)
    return transactionDate >= monthStart && transactionDate <= monthEnd
  })
  
  console.log('📊 Monthly Transactions:', monthlyTransactions.length)
  console.log('📊 Monthly Transactions Data:', monthlyTransactions)

  // Calculate income breakdown for current month
  const incomeTransactions = monthlyTransactions.filter(t => t.type === 'INCOME' && t.amount > 0)
  console.log('💰 Income Transactions:', incomeTransactions.length)
  console.log('💰 Income Transactions Data:', incomeTransactions)
  
  const incomeByCategory = incomeTransactions.reduce((acc, transaction) => {
    const category = getCategoryName(transaction.category_id) || 'Other'
    const color = getCategoryColor(transaction.category_id) || '#4CAF50'
    const amount = Math.abs(transaction.amount)
    acc[category] = (acc[category] || 0) + transaction.amount
    return acc
  }, {} as Record<string, number>)
  
  console.log('💰 Income By Category:', incomeByCategory)

  const incomeData = Object.entries(incomeByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: incomeTransactions.length > 0 ? (amount / incomeTransactions.reduce((sum, t) => sum + t.amount, 0)) * 100 : 0,
      color: getCategoryColor(incomeTransactions.find(t => getCategoryName(t.category_id) === category)?.category_id || '') || '#4CAF50'
    }))
    .sort((a, b) => b.amount - a.amount)

  const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0)
  console.log('💰 Total Income:', totalIncome)
  console.log('💰 Income Data:', incomeData)

  // Calculate expense breakdown for current month
  const expenseTransactions = monthlyTransactions.filter(t => t.type === 'EXPENSE')
  
  const expenseByCategory = expenseTransactions.reduce((acc, transaction) => {
    const category = getCategoryName(transaction.category_id) || 'Other'
    const color = getCategoryColor(transaction.category_id) || '#4CAF50'
    const amount = Math.abs(transaction.amount)
    acc[category] = (acc[category] || 0) + amount
    return acc
  }, {} as Record<string, number>)
  
  console.log('💸 Expense By Category:', expenseByCategory)

  const expenseData = Object.entries(expenseByCategory)
    .map(([category, amount]) => ({
      category,
      amount: Math.abs(amount),
      percentage: expenseTransactions.length > 0 ? (Math.abs(amount) / expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)) * 100 : 0,
      color: getCategoryColor(expenseTransactions.find(t => getCategoryName(t.category_id) === category)?.category_id || '') || '#F44336'
    }))
    .sort((a, b) => b.amount - a.amount)

  const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0)
  
  console.log('💸 Expense Data:', expenseData)
  console.log('💸 Total Expenses:', totalExpenses)
  console.log('💸 Expense Data Length:', expenseData.length)

  // Calculate budget breakdown
  const budgetData = selectedBudget?.categories.map(cat => ({
    category: cat.category,
    budgetAmount: cat.budgetAmount,
    spentAmount: cat.spentAmount,
    percentage: cat.budgetAmount > 0 ? (cat.spentAmount / cat.budgetAmount) * 100 : 0,
    color: cat.color,
    status: cat.spentAmount > cat.budgetAmount ? 'over' : cat.spentAmount > cat.budgetAmount * 0.8 ? 'warning' : 'good'
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Budget vs Actual</h3>
                    {budgets.length > 1 && (
                      <Select 
                        value={selectedBudget?.id || ''} 
                        onValueChange={(value) => setSelectedBudget(budgets.find(b => b.id === value) || null)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select budget" />
                        </SelectTrigger>
                        <SelectContent>
                          {budgets.map(budget => (
                            <SelectItem key={budget.id} value={budget.id}>
                              {budget.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} budget used
                  </p>
                </div>
                {renderPieChart(budgetData.map(item => ({ ...item, amount: item.spentAmount })), 'amount', 'category')}
              </div>
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Budget Status</h3>
                  <p className="text-sm text-gray-600">{budgetData.length} budget categories</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {renderCategoryList(budgetData, 'budget')}
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