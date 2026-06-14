'use client'

import React, { useMemo } from 'react'
import { ResponsiveSankey } from '@nivo/sankey'
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { useTheme } from 'next-themes'
import { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/molecules/card'

interface CashFlowSankeyProps {
  transactions: Transaction[]
  dateRange: {
    from: Date
    to: Date
  }
  getCategoryName: (id: string) => string
}

interface SankeyNode {
  id: string
  nodeColor?: string
  label?: string
}

interface SankeyLink {
  source: string
  target: string
  value: number
}

export function CashFlowSankey({ transactions, dateRange, getCategoryName }: CashFlowSankeyProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const data = useMemo(() => {
    // 1. Filter transactions by date range
    const filteredTransactions = transactions.filter(t => {
      const tDate = new Date(t.date)
      return isWithinInterval(tDate, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to)
      })
    })

    // 2. Aggregate Data
    const incomeByCategory: Record<string, number> = {}
    const expenseByCategory: Record<string, number> = {}
    let totalIncome = 0
    let totalExpenses = 0

    filteredTransactions.forEach(t => {
      const amount = Math.abs(Number(t.amount))
      const categoryName = t.category_id ? getCategoryName(t.category_id) : 'Uncategorized'
      
      if (t.type === 'INCOME') {
        incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + amount
        totalIncome += amount
      } else if (t.type === 'EXPENSE') {
        expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + amount
        totalExpenses += amount
      }
    })

    // 3. Build Nodes and Links
    const nodes: SankeyNode[] = []
    const links: SankeyLink[] = []

    // Helper to add node if not exists
    const addNode = (id: string, color?: string) => {
      if (!nodes.find(n => n.id === id)) {
        nodes.push({ id, nodeColor: color })
      }
    }

    // Level 2: Total Income
    const hasIncome = totalIncome > 0
    const hasExpenses = totalExpenses > 0
    const baseline = Math.max(totalIncome, totalExpenses, 1)
    const epsilon = baseline * 0.001
    addNode('Total Income', '#10b981') // Green-500

    // Level 1: Income Sources
    if (hasIncome) {
      Object.entries(incomeByCategory).forEach(([category, amount]) => {
        if (amount > 0) {
          const nodeId = `${category} (In)`
          addNode(nodeId, '#34d399') // Emerald-400
          links.push({
            source: nodeId,
            target: 'Total Income',
            value: amount
          })
        }
      })
    } else if (hasExpenses) {
      addNode('No Income', '#34d399')
      links.push({
        source: 'No Income',
        target: 'Total Income',
        value: epsilon
      })
    }

    // Level 3: Expenses & Savings
    const savings = totalIncome - totalExpenses
    
    if (hasExpenses) {
      addNode('Expenses', '#f43f5e') // Rose-500
      const incomeToExpenses = hasIncome ? Math.min(totalIncome, totalExpenses) : epsilon
      links.push({
        source: 'Total Income',
        target: 'Expenses',
        value: incomeToExpenses
      })
    }

    if (hasIncome && savings > 0) {
      addNode('Savings', '#3b82f6') // Blue-500
      links.push({
        source: 'Total Income',
        target: 'Savings',
        value: savings
      })
    }

    if (hasExpenses && totalExpenses > totalIncome) {
      const deficit = totalExpenses - totalIncome
      addNode('Deficit', '#f59e0b') // Amber-500
      links.push({
        source: 'Deficit',
        target: 'Expenses',
        value: deficit
      })
    }

    // Level 4: Expense Categories
    Object.entries(expenseByCategory).forEach(([category, amount]) => {
      if (amount > 0) {
        // Ensure unique ID if category name matches income category
        const nodeId = category 
        addNode(nodeId, '#fb7185') // Rose-400
        links.push({
          source: 'Expenses',
          target: nodeId,
          value: amount
        })
      }
    })

    return { nodes, links }
  }, [transactions, dateRange, getCategoryName])

  // Handle empty state
  if (data.nodes.length === 0 || data.links.length === 0) {
    return (
      <Card className="w-full flex flex-col h-[420px] sm:h-[480px] lg:h-[520px]">
        <CardHeader>
          <CardTitle>Cash Flow Diagram</CardTitle>
          <CardDescription>Visualize the flow of your income to expenses and savings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex-1 h-full items-center px-auto py-auto justify-center text-muted-foreground">
          <span className="text-sm">No data available for the selected period</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full flex flex-col h-[420px] sm:h-[480px] lg:h-[520px]">
      <CardHeader>
        <CardTitle>Cash Flow Diagram</CardTitle>
        <CardDescription>Visualize the flow of your income to expenses and savings</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-5">
        <div className="h-full w-full">
          <ResponsiveSankey
            data={data}
            margin={{ top: 0, right: 15, bottom: 15, left: 0 }}
            align="justify"
            colors={node => node.nodeColor || '#888888'}
            nodeOpacity={1}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={18}
            nodeSpacing={24}
            nodeBorderWidth={0}
            nodeBorderColor={{
              from: 'color',
              modifiers: [['darker', 0.8]]
            }}
            linkOpacity={0.5}
            linkHoverOthersOpacity={0.1}
            linkContract={3}
            enableLinkGradient={true}
            labelPosition="inside"
            labelOrientation="horizontal"
            labelPadding={16}
            labelTextColor={{
              from: 'color',
              modifiers: [['darker', 1]]
            }}
            theme={{
              text: {
                fill: isDark ? '#e2e8f0' : '#1e293b',
                fontSize: 12,
              },
              tooltip: {
                container: {
                  background: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#e2e8f0' : '#1e293b',
                  fontSize: 12,
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }
              }
            }}
            valueFormat={value => formatCurrency(value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
