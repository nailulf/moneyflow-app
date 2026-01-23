'use client'

import React, { useState, useEffect } from 'react'
import { Transaction, CategoryDB } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react'
import {
  calculateTotalIncome,
  calculateTotalSpending,
  calculateIncomeByCategories,
  calculateSpendingByCategories,
  calculateNetCashflow,
  calculateAllMetrics,
  filterTransactionsByMonth
} from './financial-metrics-calculator'
import { formatCurrency } from '@/lib/data-utils'

interface FinancialMetricsDisplayProps {
  transactions: Transaction[]
  categories: CategoryDB[]
  selectedMonth?: Date
}

/**
 * Financial Metrics Display Component
 * Demonstrates how to use the financial metrics calculations in a React component
 */
export function FinancialMetricsDisplay({
  transactions,
  categories,
  selectedMonth = new Date()
}: FinancialMetricsDisplayProps) {
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      setLoading(true)
      
      // Filter transactions for the selected month
      const monthlyTransactions = filterTransactionsByMonth(transactions, selectedMonth)
      setFilteredTransactions(monthlyTransactions)
      
      // Calculate all metrics
      const calculatedMetrics = calculateAllMetrics(monthlyTransactions, categories)
      setMetrics(calculatedMetrics)
      
    } catch (error) {
      console.error('Error calculating financial metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [transactions, categories, selectedMonth])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No financial data available</p>
        </CardContent>
      </Card>
    )
  }

  const {
    totalIncome,
    totalSpending,
    netCashflow,
    incomeByCategories,
    spendingByCategories,
    period
  } = metrics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Financial Metrics</h2>
        <p className="text-muted-foreground">
          {period.startDate} - {period.endDate}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income Card */}
        <Card className="border-success/20 bg-success/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-success">
              Total Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-success/80 mt-1">
              {incomeByCategories.length} income sources
            </p>
          </CardContent>
        </Card>

        {/* Total Spending Card */}
        <Card className="border-destructive/20 bg-destructive/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Total Spending
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalSpending)}
            </div>
            <p className="text-xs text-destructive/80 mt-1">
              {spendingByCategories.length} expense categories
            </p>
          </CardContent>
        </Card>

        {/* Net Cashflow Card */}
        <Card className={netCashflow >= 0 ? "border-primary/20 bg-primary/10" : "border-warning/20 bg-warning/10"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={netCashflow >= 0 ? "text-sm font-medium text-primary" : "text-sm font-medium text-warning"}>
              Net Cashflow
            </CardTitle>
            <DollarSign className={netCashflow >= 0 ? "h-4 w-4 text-primary" : "h-4 w-4 text-warning"} />
          </CardHeader>
          <CardContent>
            <div className={netCashflow >= 0 ? "text-2xl font-bold text-primary" : "text-2xl font-bold text-warning"}>
              {formatCurrency(Math.abs(netCashflow))}
            </div>
            <div className="flex items-center mt-1">
              <Badge 
                variant={netCashflow >= 0 ? 'default' : 'destructive'}
                className="text-xs"
              >
                {netCashflow >= 0 ? 'Surplus' : 'Deficit'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Income Breakdown
          </TabsTrigger>
          <TabsTrigger value="spending" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Spending Breakdown
          </TabsTrigger>
        </TabsList>

        {/* Income Breakdown Tab */}
        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Income by Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incomeByCategories.length > 0 ? (
                <div className="space-y-4">
                  {incomeByCategories.map((category: any, index: number) => (
                    <div key={category.categoryId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ 
                              backgroundColor: categories.find(c => c.id === category.categoryId)?.color || 'hsl(var(--muted-foreground))' 
                            }}
                          />
                          <span className="font-medium">{category.categoryName}</span>
                          <Badge variant="outline" className="text-xs">
                            {category.transactionCount} transactions
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-success">
                            {formatCurrency(category.amount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {category.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <Progress 
                        value={category.percentage} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No income transactions found for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spending Breakdown Tab */}
        <TabsContent value="spending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-destructive" />
                Spending by Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {spendingByCategories.length > 0 ? (
                <div className="space-y-4">
                  {spendingByCategories.map((category: any, index: number) => (
                    <div key={category.categoryId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ 
                              backgroundColor: categories.find(c => c.id === category.categoryId)?.color || 'hsl(var(--muted-foreground))' 
                            }}
                          />
                          <span className="font-medium">{category.categoryName}</span>
                          <Badge variant="outline" className="text-xs">
                            {category.transactionCount} transactions
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-destructive">
                            {formatCurrency(category.amount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {category.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <Progress 
                        value={category.percentage} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No expense transactions found for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {filteredTransactions.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Transactions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">
                {filteredTransactions.filter(t => t.type === 'INCOME').length}
              </div>
              <div className="text-sm text-muted-foreground">Income Transactions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-destructive">
                {filteredTransactions.filter(t => t.type === 'EXPENSE').length}
              </div>
              <div className="text-sm text-muted-foreground">Expense Transactions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-chart-4">
                {new Set(filteredTransactions.map(t => t.category_id)).size}
              </div>
              <div className="text-sm text-muted-foreground">Unique Categories</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Example usage of the FinancialMetricsDisplay component
 */
export function ExampleFinancialMetricsPage() {
  // This would typically come from your data fetching hooks
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<CategoryDB[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  // Example of how you might fetch data
  useEffect(() => {
    // Replace with your actual data fetching logic
    // fetchTransactions().then(setTransactions)
    // fetchCategories().then(setCategories)
  }, [])

  return (
    <div className="container mx-auto p-6">
      <FinancialMetricsDisplay 
        transactions={transactions}
        categories={categories}
        selectedMonth={selectedMonth}
      />
    </div>
  )
}

export default FinancialMetricsDisplay