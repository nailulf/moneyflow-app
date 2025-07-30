'use client'

import { useState, useEffect } from 'react'
import { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { CATEGORY_COLORS } from '@/types/app'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'


interface TransactionTableProps {
  transactions: Transaction[]
  limit?: number
}

export function TransactionTable({ transactions, limit = 10 }: TransactionTableProps) {
  const [isClient, setIsClient] = useState(false)
  const displayTransactions = transactions.slice(0, limit)

  useEffect(() => {
    setIsClient(true)
  }, [])
  
  if (!isClient) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Budgeting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (displayTransactions.length === 0) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-500">
            No holdings found
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Budgeting</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200">
                <TableHead className="text-xs font-medium text-gray-600 py-2">Name</TableHead>
                <TableHead className="text-xs font-medium text-gray-600 py-2">Value/Invested</TableHead>
                <TableHead className="text-xs font-medium text-gray-600 py-2">Gain</TableHead>
                <TableHead className="text-xs font-medium text-gray-600 text-right py-2">Allocation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTransactions.map((transaction) => {
                const totalAmount = displayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
                const allocation = totalAmount > 0 ? (Math.abs(transaction.amount) / totalAmount * 100) : 0
                const gain = Math.abs(transaction.amount) * 0.1 // Deterministic mock gain calculation
                return (
                  <TableRow key={transaction.id} className="border-gray-100 hover:bg-gray-50">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: CATEGORY_COLORS[transaction.category as keyof typeof CATEGORY_COLORS] }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{transaction.category}</div>
                          <div className="text-xs text-gray-500">{transaction.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(Math.abs(transaction.amount))}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(Math.abs(transaction.amount) * 0.9)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className={`text-sm font-medium ${
                        gain >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {gain >= 0 ? '+' : ''}{formatCurrency(gain)}
                      </div>
                      <div className={`text-xs ${
                        gain >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {gain >= 0 ? '+' : ''}{Math.abs(transaction.amount) > 0 ? (gain / Math.abs(transaction.amount) * 100).toFixed(1) : '0.0'}%
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <div className="text-sm font-medium text-gray-900">{allocation.toFixed(1)}%</div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}