'use client'

import React from 'react'
import { Transaction } from '@/types/database'
import { useCategories } from '@/hooks/use-category-manager'
import CashFlowSankeyChart from './CashFlowSankeyChart'

interface CashFlowChartProps {
  transactions: Transaction[]
  dateRange: {
    from: Date
    to: Date
  }
  chartType?: 'line' | 'bar'
}

export default function CashFlowChart({ transactions, dateRange, chartType = 'bar' }: CashFlowChartProps) {
  // Get test user ID from environment
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!
  
  // Fetch categories
  const { allCategories, isLoading: categoriesLoading } = useCategories(TEST_USER_ID)
  
  console.log('CashFlowChart received transactions:', transactions)
  console.log('CashFlowChart received dateRange:', dateRange)
  console.log('CashFlowChart categories:', allCategories.length)

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Loading...</p>
          <p className="text-sm text-muted-foreground">Fetching category data</p>
        </div>
      </div>
    )
  }

  return (
    <CashFlowSankeyChart 
      transactions={transactions}
      categories={allCategories}
      dateRange={dateRange} 
    />
  )
}