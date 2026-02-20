'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Label } from 'recharts'
import { formatCurrency } from '@/lib/data-utils'
import { calculateBudgetStatus } from '@/lib/budget-utils'
import { useCategories } from '@/contexts/CategoryContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/molecules/tabs'
import { Badge } from '@/components/ui/atoms/badge'
import { Button } from '@/components/ui/atoms/button'
import { Skeleton } from '@/components/ui/atoms/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/molecules/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/organisms/chart'
import { CATEGORIES, CashFlowBreakdownProps } from '@/types/app'
import { TrendingUp, TrendingDown, Wallet, Pencil, ArrowRight } from 'lucide-react'
import { BudgetPlanEditSheet } from '@/components/BudgetPlanEditSheet'

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

export function CashFlowBreakdown({
  transactions,
  period = 'monthly',
  budgetSnapshot,
  budgetSnapshotLoading,
  budgetNoSnapshot,
  budgetSnapshotError,
  budgetPlan,
  budgetPlanLoading,
  onBudgetPlanSaved,
}: CashFlowBreakdownProps) {
  const [viewBy, setViewBy] = useState<'category' | 'amount'>('category')
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const { getCategoryName, getCategoryColor } = useCategories()

  const filteredTransactions = transactions

  // === EXPENSE DATA ===
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
        color: getCategoryColor(transaction.category_id) || 'hsl(var(--chart-1))'
      }
    }
    acc[categoryName].amount += amount
    return acc
  }, {} as Record<string, CategoryData>)

  interface CategoryDataWithPercentage extends CategoryData {
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

  // === INCOME DATA ===
  const incomeTransactions = filteredTransactions.filter(t => t.amount > 0 && t.type === 'INCOME')
  const incomeByCategory = incomeTransactions.reduce((acc, transaction) => {
    const categoryName = getCategoryName(transaction.category_id) || 'Other'
    const amount = transaction.amount

    if (!acc[categoryName]) {
      acc[categoryName] = {
        category: categoryName,
        amount: 0,
        color: getCategoryColor(transaction.category_id) || 'hsl(var(--chart-2))'
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

  // === BUDGET DATA ===
  const budgetCurrency = budgetSnapshot?.currency || 'IDR'
  const totalBudget = budgetSnapshot?.total_amount || 0
  const budgetIsLoading = budgetSnapshotLoading || budgetPlanLoading
  const hasBudget = !!budgetSnapshot && !budgetNoSnapshot
  const hasNoBudgetAtAll = budgetNoSnapshot && !budgetPlan
  const isUpcoming = budgetSnapshot?.status === 'upcoming'

  // Calculate spending from client-side transactions (same data the Expenses tab uses)
  const budgetSpendingByCategory = useMemo(() => {
    if (budgetSnapshot?.budget_snapshot_categories?.length) {
      return budgetSnapshot.budget_snapshot_categories.reduce((acc, category) => {
        if (category.category_id) {
          acc[category.category_id] = category.spent_amount || 0
        }
        return acc
      }, {} as Record<string, number>)
    }
    if (!budgetSnapshot?.budget_snapshot_categories) return {} as Record<string, number>
    const budgetCategoryIds = new Set(
      budgetSnapshot.budget_snapshot_categories.map(c => c.category_id)
    )
    const spending: Record<string, number> = {}
    for (const t of filteredTransactions) {
      if (t.type === 'EXPENSE' && t.category_id && budgetCategoryIds.has(t.category_id)) {
        spending[t.category_id] = (spending[t.category_id] || 0) + Math.abs(t.amount)
      }
    }
    return spending
  }, [budgetSnapshot, filteredTransactions])

  const totalBudgetSpent = useMemo(() => {
    if (budgetSnapshot && typeof budgetSnapshot.total_spent === 'number') {
      return budgetSnapshot.total_spent
    }
    return Object.values(budgetSpendingByCategory).reduce((sum, v) => sum + v, 0)
  }, [budgetSnapshot, budgetSpendingByCategory])

  const budgetUsedPct = totalBudget > 0 ? (totalBudgetSpent / totalBudget) * 100 : 0

  const budgetDonutData = useMemo(() => {
    if (!budgetSnapshot) return []
    const spentColor = budgetUsedPct > 100
      ? 'hsl(var(--destructive))'
      : budgetUsedPct > 80
        ? 'hsl(var(--chart-4))'
        : 'hsl(var(--success))'
    return [
      { name: 'Spent', value: totalBudgetSpent, color: spentColor },
      { name: 'Remaining', value: Math.max(totalBudget - totalBudgetSpent, 0), color: 'hsl(var(--muted))' },
    ]
  }, [budgetSnapshot, totalBudget, totalBudgetSpent, budgetUsedPct])

  // === RENDER HELPERS ===

  const renderPieChart = (data: CategoryDataWithPercentage[], dataKey: string, nameKey: string) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
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
              <Cell key={`cell-${index}`} fill={entry.color || `hsl(var(--chart-${(index % 12) + 1}))`} />
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

  const renderCategoryList = (data: CategoryDataWithPercentage[], type: 'expense' | 'income') => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <p>No {type} data available</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.category} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center space-x-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-sm leading-body-sm">{item.category}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-sm leading-body-sm">
                {formatCurrency(item.amount)}
              </div>
              <span className="text-xs leading-caption text-muted-foreground">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderBudgetDonutChart = () => {
    if (budgetDonutData.length === 0) return null

    return (
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
        <PieChart>
          <Pie
            data={budgetDonutData}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={110}
            strokeWidth={3}
          >
            {budgetDonutData.map((entry, i) => (
              <Cell key={`budget-cell-${i}`} fill={entry.color} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 14} className="fill-foreground text-xl font-bold">
                        {budgetUsedPct.toFixed(1)}%
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 6} className="fill-foreground text-lg font-semibold">
                        {formatCurrency(totalBudgetSpent, budgetCurrency)}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                        {formatCurrency(totalBudget, budgetCurrency)} budget
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    )
  }

  const renderBudgetCategoryList = () => {
    const categories = budgetSnapshot?.budget_snapshot_categories || []
    if (categories.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <p>No budget categories</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {categories.map((cat) => {
          const catName = cat.categories?.name || 'Unknown'
          const catColor = cat.categories?.color || '#888'
          const allocated = cat.allocated_amount
          const spent = budgetSpendingByCategory[cat.category_id] || 0
          const available = allocated - spent
          const progress = allocated > 0 ? (spent / allocated) * 100 : 0
          const status = calculateBudgetStatus(spent, allocated)

          return (
            <div key={cat.id} className="p-3 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: catColor }}
                  />
                  <span className="font-medium text-sm leading-body-sm">{catName}</span>
                </div>
                <Badge
                  variant={status === 'over' ? 'destructive' : status === 'warning' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {status === 'over' ? 'Over' : status === 'warning' ? 'Warning' : 'On track'}
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    status === 'over' ? 'bg-destructive'
                    : status === 'warning' ? 'bg-[hsl(var(--chart-4))]'
                    : 'bg-success'
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>

              {/* Amounts row */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Spent: <span className="text-foreground font-medium">{formatCurrency(spent, budgetCurrency)}</span></span>
                <span>Budget: <span className="text-foreground font-medium">{formatCurrency(allocated, budgetCurrency)}</span></span>
                <span className={available < 0 ? 'text-destructive' : 'text-success'}>
                  {available < 0 ? 'Over' : 'Left'}: <span className="font-medium">{formatCurrency(Math.abs(available), budgetCurrency)}</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderBudgetTab = () => {
    // Loading state
    if (budgetIsLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )
    }

    // Error state
    if (budgetSnapshotError) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-destructive">Error loading budget data.</p>
          <p className="text-xs text-muted-foreground mt-1">{budgetSnapshotError}</p>
        </div>
      )
    }

    // Empty state — no budget at all
    if (hasNoBudgetAtAll) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium mb-1">No budget set for this period</p>
          <p className="text-xs mb-4">Create a budget to track your spending against targets.</p>
          {onBudgetPlanSaved && (
            <Button size="sm" onClick={() => setEditSheetOpen(true)}>
              Set up your budget
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      )
    }

    // Budget view
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-title-5 font-semibold mb-2">
                Budget Performance
                {isUpcoming && (
                  <Badge variant="secondary" className="ml-2 text-xs align-middle">Upcoming</Badge>
                )}
              </h3>
              <p className="text-sm leading-body-sm text-muted-foreground">
                {isUpcoming
                  ? 'Projected budget for this period'
                  : `${budgetUsedPct.toFixed(1)}% of budget used`}
              </p>
            </div>
          </div>
          {renderBudgetDonutChart()}
            <div className="mb-4 flex items-center justify-center">
            {onBudgetPlanSaved && (
                <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit budget
                </Button>
              )}
            </div>
        </div>
        <div>
          <div className="mb-4">
            <h3 className="text-lg leading-title-5 font-semibold mb-2">Category Breakdown</h3>
            <p className="text-sm leading-body-sm text-muted-foreground">
              {budgetSnapshot?.budget_snapshot_categories?.length || 0} budget categories
            </p>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {renderBudgetCategoryList()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl leading-title-4 font-semibold">Cash Flow Breakdown</CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm leading-body-sm text-muted-foreground">View by</span>
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
                <Wallet className="h-4 w-4" />
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
                    <h3 className="text-lg leading-title-5 font-semibold mb-2">Expenses</h3>
                    <p className="text-sm leading-body-sm text-muted-foreground">Total spending this month: {formatCurrency(totalExpenses)}</p>
                  </div>
                  {renderPieChart(expenseData, 'amount', 'category')}
                </div>
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg leading-title-5 font-semibold mb-2">Expenses Breakdown</h3>
                    <p className="text-sm leading-body-sm text-muted-foreground">{expenseData.length} expense categories</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {renderCategoryList(expenseData, 'expense')}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="budget" className="mt-6">
              {renderBudgetTab()}
            </TabsContent>

            <TabsContent value="income" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg leading-title-5 font-semibold mb-2">Income Sources</h3>
                    <p className="text-sm leading-body-sm text-muted-foreground">Total income this month: {formatCurrency(totalIncome)}</p>
                  </div>
                  {renderPieChart(incomeData, 'amount', 'category')}
                </div>
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg leading-title-5 font-semibold mb-2">Income Breakdown</h3>
                    <p className="text-sm leading-body-sm text-muted-foreground">{incomeData.length} income sources</p>
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
      {onBudgetPlanSaved && (
        <BudgetPlanEditSheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          period={period}
          plan={budgetPlan || null}
          hasExistingSnapshot={hasBudget}
          onPlanSaved={() => {
            onBudgetPlanSaved()
            setEditSheetOpen(false)
          }}
        />
      )}
    </>
  )
}
