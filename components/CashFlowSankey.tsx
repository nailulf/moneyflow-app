'use client'

import React, { useMemo } from 'react'
import { ResponsiveSankey } from '@nivo/sankey'
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { useTheme } from 'next-themes'
import { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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
      const amount = Number(t.amount)
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
    if (totalIncome > 0) {
        addNode('Total Income', '#10b981') // Green-500
    }

    // Level 1: Income Sources
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

    // Level 3: Expenses & Savings
    const savings = totalIncome - totalExpenses
    
    if (totalExpenses > 0) {
        addNode('Expenses', '#f43f5e') // Rose-500
        links.push({
            source: 'Total Income',
            target: 'Expenses',
            value: totalExpenses
        })
    }

    if (savings > 0) {
        addNode('Savings', '#3b82f6') // Blue-500
        links.push({
            source: 'Total Income',
            target: 'Savings',
            value: savings
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
      <Card className="flex items-center justify-center h-[500px] text-muted-foreground border-dashed">
        <CardContent>
          No data available for the selected period
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full flex flex-col h-[750px]">
      <CardHeader>
        <CardTitle>Cash Flow Diagram</CardTitle>
        <CardDescription>Visualize the flow of your income to expenses and savings</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-5">
        <ResponsiveSankey
          data={data}
          margin={{ top: 10, right: 160, bottom: 10, left: 160 }}
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
        labelPosition="outside"
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
      </CardContent>
    </Card>
  )
}
