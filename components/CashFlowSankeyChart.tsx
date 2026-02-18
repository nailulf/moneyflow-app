'use client'

import React, { useMemo, useEffect, useRef } from 'react'
import { Transaction } from '@/types/database'
import { CategoryItem } from '@/types/app'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/data-utils'

// Declare Google Charts types
declare global {
  interface Window {
    google: any;
  }
}

interface CashFlowSankeyChartProps {
  transactions: Transaction[]
  categories: CategoryItem[]
  dateRange: {
    from: Date
    to: Date
  }
}

interface SankeyNode {
  id: string
  nodeColor?: string
}

interface SankeyLink {
  source: string
  target: string
  value: number
}

interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

export default function CashFlowSankeyChart({ transactions, categories, dateRange }: CashFlowSankeyChartProps) {
  // Helper function to get category name and color
  const getCategoryInfo = (categoryId: string | null) => {
    if (!categoryId) return { name: 'Uncategorized', color: 'hsl(var(--muted-foreground))' }
    const category = categories.find(cat => cat.id === categoryId)
    return {
      name: category?.name || 'Unknown Category',
      color: category?.color || 'hsl(var(--muted-foreground))'
    }
  }

  // Mapping function to categorize expenses and transfers into predefined subcategories
  const getSubcategory = (categoryName: string, transactionType: 'EXPENSE' | 'TRANSFER') => {
    if (transactionType === 'EXPENSE') {
      const lowerName = categoryName.toLowerCase()
      if (lowerName.includes('grocery') || lowerName.includes('food') || lowerName.includes('supermarket')) {
        return 'Groceries'
      }
      if (lowerName.includes('restaurant') || lowerName.includes('dining') || lowerName.includes('eat')) {
        return 'Eating Out'
      }
      if (lowerName.includes('bill') || lowerName.includes('utility') || lowerName.includes('subscription') || lowerName.includes('insurance')) {
        return 'Billings'
      }
      return 'Other Expenses'
    } else {
      const lowerName = categoryName.toLowerCase()
      if (lowerName.includes('saving') || lowerName.includes('emergency')) {
        return 'Savings'
      }
      if (lowerName.includes('current') || lowerName.includes('checking') || lowerName.includes('daily')) {
        return 'Current Account'
      }
      if (lowerName.includes('invest') || lowerName.includes('stock') || lowerName.includes('bond') || lowerName.includes('portfolio')) {
        return 'Investments'
      }
      return 'Other Transfers'
    }
  }

  // Google Charts data structure for three-layer hierarchy
  const sankeyData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return []
    }

    // Filter transactions by date range
    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date)
      return transactionDate >= dateRange.from && transactionDate <= dateRange.to
    })

    if (filteredTransactions.length === 0) {
      return []
    }

    // Separate transactions by type
    const incomeTransactions = filteredTransactions.filter(t => t.type === 'INCOME')
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'EXPENSE')
    const transferTransactions = filteredTransactions.filter(t => t.type === 'TRANSFER')

    // Calculate totals for Layer 1 and Layer 2
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const totalTransfers = transferTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    // Group expenses by subcategories (Layer 3)
    const expenseSubcategories = {
      'Groceries': 0,
      'Eating Out': 0,
      'Billings': 0,
      'Other Expenses': 0
    }

    expenseTransactions.forEach(transaction => {
      const categoryInfo = getCategoryInfo(transaction.category_id)
      const subcategory = getSubcategory(categoryInfo.name, 'EXPENSE')
      expenseSubcategories[subcategory as keyof typeof expenseSubcategories] += Math.abs(transaction.amount)
    })

    // Group transfers by subcategories (Layer 3)
    const transferSubcategories = {
      'Savings': 0,
      'Current Account': 0,
      'Investments': 0,
      'Other Transfers': 0
    }

    transferTransactions.forEach(transaction => {
      const categoryInfo = getCategoryInfo(transaction.category_id)
      const subcategory = getSubcategory(categoryInfo.name, 'TRANSFER')
      transferSubcategories[subcategory as keyof typeof transferSubcategories] += Math.abs(transaction.amount)
    })

    // Create Google Charts Sankey data array with three-layer hierarchy
    const data: (string | number)[][] = [['From', 'To', 'Weight']]

    // Layer 1 → Layer 2: Total Income to Total Expense/Transfer
    if (totalExpenses > 0) {
      data.push(['Total Income', 'Total Expense', totalExpenses])
    }
    if (totalTransfers > 0) {
      data.push(['Total Income', 'Total Transfer', totalTransfers])
    }

    // Layer 2 → Layer 3: Total Expense to Expense Subcategories
    Object.entries(expenseSubcategories).forEach(([subcategory, amount]) => {
      if (amount > 0) {
        data.push(['Total Expense', subcategory, amount])
      }
    })

    // Layer 2 → Layer 3: Total Transfer to Transfer Subcategories
    Object.entries(transferSubcategories).forEach(([subcategory, amount]) => {
      if (amount > 0) {
        data.push(['Total Transfer', subcategory, amount])
      }
    })

    return data
  }, [transactions, categories, dateRange])

  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sankeyData.length || sankeyData.length <= 1) return

    const loadGoogleCharts = () => {
      if (window.google && window.google.charts && window.google.visualization) {
        drawChart()
      } else {
        const script = document.createElement('script')
        script.src = 'https://www.gstatic.com/charts/loader.js'
        script.onload = () => {
          window.google.charts.load('current', { packages: ['sankey'] })
          window.google.charts.setOnLoadCallback(() => {
            // Ensure visualization is available before calling drawChart
            if (window.google && window.google.visualization) {
              drawChart()
            }
          })
        }
        document.head.appendChild(script)
      }
    }

    const drawChart = () => {
      if (!chartRef.current || !window.google || !window.google.visualization) return

      const data = window.google.visualization.arrayToDataTable(sankeyData)
      const containerWidth = chartRef.current.offsetWidth
      const isMobile = containerWidth < 768

      const options = {
        width: '100%',
        height: isMobile ? 400 : 500,
        sankey: {
          node: {
            // Enhanced color scheme for three-layer hierarchy
            colors: [
              'hsl(var(--success))', // Layer 1: Total Income
              'hsl(var(--destructive))', // Layer 2: Total Expense
              'hsl(var(--primary))', // Layer 2: Total Transfer
              'hsl(var(--chart-4))', // Layer 3: Groceries
              'hsl(var(--destructive))', // Layer 3: Eating Out
              'hsl(var(--chart-5))', // Layer 3: Billings
              'hsl(var(--muted-foreground))', // Layer 3: Other Expenses
              'hsl(var(--success))', // Layer 3: Savings
              'hsl(var(--primary))', // Layer 3: Current Account
              'hsl(var(--chart-3))', // Layer 3: Investments
              'hsl(var(--muted-foreground))'  // Layer 3: Other Transfers
            ],
            label: {
              fontName: 'system-ui, -apple-system, sans-serif',
              fontSize: isMobile ? 11 : 13,
              color: 'hsl(var(--foreground))',
              bold: true
            },
            nodePadding: isMobile ? 80 : 100,
            width: isMobile ? 12 : 16,
            interactivity: true
          },
          link: {
            colorMode: 'gradient',
            colors: [
              'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--primary))', 'hsl(var(--chart-4))', 'hsl(var(--destructive))', 
              'hsl(var(--chart-5))', 'hsl(var(--muted-foreground))', 'hsl(var(--success))', 'hsl(var(--primary))', 'hsl(var(--chart-3))', 'hsl(var(--muted-foreground))'
            ],
            fillOpacity: 0.7,
            strokeOpacity: 0.3
          },
          iterations: 128
        },
        tooltip: {
          isHtml: true,
          textStyle: {
            fontSize: 13,
            fontName: 'system-ui, -apple-system, sans-serif',
            color: 'hsl(var(--foreground))'
          },
          showColorCode: true
        }
      }

      const chart = new window.google.visualization.Sankey(chartRef.current)
      chart.draw(data, options)
    }

    loadGoogleCharts()

    // Add resize listener for responsive design
    const handleResize = () => {
      if (window.google && window.google.charts && window.google.visualization && sankeyData.length > 1) {
        drawChart()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sankeyData])

  if (!sankeyData.length || sankeyData.length <= 1) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl leading-title-4 font-semibold">Cash Flow Analysis</CardTitle>
          <p className="text-sm leading-body-sm text-muted-foreground">
            Visualize your income distribution across expense and transfer categories with clear hierarchical breakdown
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p className="text-lg leading-title-5 font-medium mb-2">No data available</p>
              <p className="text-sm leading-body-sm">
                Add some transactions to see your cash flow visualization
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl leading-title-4 font-semibold">Cash Flow Analysis</CardTitle>
        <p className="text-sm leading-body-sm text-muted-foreground">
          Track your income flow through expenses, categories and merchants
        </p>
      </CardHeader>
      <CardContent>
         <div ref={chartRef} className="h-[300px] md:h-96 w-full min-h-[250px]" />
      </CardContent>
    </Card>
  )
}