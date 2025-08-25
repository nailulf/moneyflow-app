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
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
          <p className="text-gray-500">No financial data available</p>
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
        <p className="text-gray-600">
          {period.startDate} - {period.endDate}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income Card */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Total Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(totalIncome)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              {incomeByCategories.length} income sources
            </p>
          </CardContent>
        </Card>

        {/* Total Spending Card */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">
              Total Spending
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(totalSpending)}
            </div>
            <p className="text-xs text-red-600 mt-1">
              {spendingByCategories.length} expense categories
            </p>
          </CardContent>
        </Card>

        {/* Net Cashflow Card */}
        <Card className={`border-${netCashflow >= 0 ? 'blue' : 'orange'}-200 bg-${netCashflow >= 0 ? 'blue' : 'orange'}-50`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium text-${netCashflow >= 0 ? 'blue' : 'orange'}-800`}>
              Net Cashflow
            </CardTitle>
            <DollarSign className={`h-4 w-4 text-${netCashflow >= 0 ? 'blue' : 'orange'}-600`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold text-${netCashflow >= 0 ? 'blue' : 'orange'}-900`}>
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(Math.abs(netCashflow))}
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
                <TrendingUp className="h-5 w-5 text-green-600" />
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
                              backgroundColor: categories.find(c => c.id === category.categoryId)?.color || '#6B7280' 
                            }}
                          />
                          <span className="font-medium">{category.categoryName}</span>
                          <Badge variant="outline" className="text-xs">
                            {category.transactionCount} transactions
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-700">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(category.amount)}
                          </div>
                          <div className="text-sm text-gray-500">
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
                <div className="text-center py-8 text-gray-500">
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
                <PieChart className="h-5 w-5 text-red-600" />
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
                              backgroundColor: categories.find(c => c.id === category.categoryId)?.color || '#6B7280' 
                            }}
                          />
                          <span className="font-medium">{category.categoryName}</span>
                          <Badge variant="outline" className="text-xs">
                            {category.transactionCount} transactions
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-red-700">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(category.amount)}
                          </div>
                          <div className="text-sm text-gray-500">
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
                <div className="text-center py-8 text-gray-500">
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
              <div className="text-2xl font-bold text-blue-600">
                {filteredTransactions.length}
              </div>
              <div className="text-sm text-gray-500">Total Transactions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {filteredTransactions.filter(t => t.type === 'INCOME').length}
              </div>
              <div className="text-sm text-gray-500">Income Transactions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {filteredTransactions.filter(t => t.type === 'EXPENSE').length}
              </div>
              <div className="text-sm text-gray-500">Expense Transactions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {new Set(filteredTransactions.map(t => t.category_id)).size}
              </div>
              <div className="text-sm text-gray-500">Unique Categories</div>
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