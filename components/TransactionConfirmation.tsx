'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Upload,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface ParsedTransaction {
  id: string
  date: string
  description: string
  amount: number
  category?: string
  account?: string
  reference?: string
  isDuplicate?: boolean
  duplicateReason?: string
  originalRow: number
}

interface TransactionConfirmationProps {
  transactions: ParsedTransaction[]
  accountId: string
  accountName?: string
  onConfirm: () => void
  onBack: () => void
  isLoading?: boolean
}

export default function TransactionConfirmation({ 
  transactions, 
  accountId,
  accountName,
  onConfirm, 
  onBack,
  isLoading = false
}: TransactionConfirmationProps) {
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalTransactions = transactions.length
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
    const credits = transactions.filter(t => t.amount > 0)
    const debits = transactions.filter(t => t.amount < 0)
    const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0)
    const totalDebits = Math.abs(debits.reduce((sum, t) => sum + t.amount, 0))
    
    const dateRange = {
      earliest: new Date(Math.min(...transactions.map(t => new Date(t.date).getTime()))),
      latest: new Date(Math.max(...transactions.map(t => new Date(t.date).getTime())))
    }

    const categoryCounts = transactions.reduce((acc, t) => {
      const category = t.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)

    return {
      totalTransactions,
      totalAmount,
      totalCredits,
      totalDebits,
      creditCount: credits.length,
      debitCount: debits.length,
      dateRange,
      topCategories
    }
  }, [transactions])

  const displayTransactions = showAllTransactions ? transactions : transactions.slice(0, 10)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Confirm Transaction Import
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Import Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">{summary.totalTransactions}</div>
                    <div className="text-sm text-gray-600">Transactions</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-600">
                      {summary.totalCredits.toLocaleString('en-US', { 
                        style: 'currency', 
                        currency: 'USD' 
                      })}
                    </div>
                    <div className="text-sm text-gray-600">Credits ({summary.creditCount})</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-semibold text-red-600">
                      {summary.totalDebits.toLocaleString('en-US', { 
                        style: 'currency', 
                        currency: 'USD' 
                      })}
                    </div>
                    <div className="text-sm text-gray-600">Debits ({summary.debitCount})</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className={`font-semibold ${summary.totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {summary.totalAmount.toLocaleString('en-US', { 
                        style: 'currency', 
                        currency: 'USD' 
                      })}
                    </div>
                    <div className="text-sm text-gray-600">Net Amount</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Account Information */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Import Details</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Target Account:</span>
                  <span className="ml-2 font-medium">{accountName || accountId}</span>
                </div>
                <div>
                  <span className="text-gray-600">Date Range:</span>
                  <span className="ml-2 font-medium">
                    {summary.dateRange.earliest.toLocaleDateString()} - {summary.dateRange.latest.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Category Breakdown */}
            {summary.topCategories.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Category Breakdown</h3>
                <div className="space-y-2">
                  {summary.topCategories.map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm">{category}</span>
                      <Badge variant="outline">{count} transactions</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Transaction Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Transaction Preview</h3>
                {transactions.length > 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                  >
                    {showAllTransactions ? 'Show Less' : `Show All (${transactions.length})`}
                  </Button>
                )}
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={transaction.description}>
                            {transaction.description}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                            {transaction.amount.toLocaleString('en-US', { 
                              style: 'currency', 
                              currency: 'USD' 
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {transaction.category ? (
                            <Badge variant="outline">{transaction.category}</Badge>
                          ) : (
                            <span className="text-gray-400">Uncategorized</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {!showAllTransactions && transactions.length > 10 && (
                  <div className="p-3 text-center text-sm text-gray-600 border-t">
                    Showing 10 of {transactions.length} transactions
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Final Confirmation */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">Ready to Import</div>
                  <div className="text-sm">
                    You are about to import {summary.totalTransactions} transactions 
                    into {accountName || 'the selected account'}. This action cannot be undone.
                  </div>
                  <div className="text-sm text-gray-600">
                    Please review the transaction details above and click "Import Transactions" to proceed.
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onBack} disabled={isLoading}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Preview
              </Button>
              <Button 
                onClick={onConfirm}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import Transactions
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}