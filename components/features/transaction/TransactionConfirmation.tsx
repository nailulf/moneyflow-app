'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import { Button } from '@/components/ui/atoms/button'
import { Badge } from '@/components/ui/atoms/badge'
import { Alert, AlertDescription } from '@/components/ui/molecules/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/molecules/table'
import { Separator } from '@/components/ui/atoms/separator'
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
import { formatCurrency } from '@/lib/data-utils'

interface ParsedTransaction {
  id: string
  date: string
  description: string
  amount: number
  category?: string
  category_id?: string
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
  const t = useTranslations('transactions.confirmation')
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [page, setPage] = useState(1)
  const itemsPerPage = 10
  
  const totalPages = Math.ceil(transactions.length / itemsPerPage)
  
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return transactions.slice(start, start + itemsPerPage)
  }, [transactions, page])

  const displayTransactions = showAllTransactions ? paginatedTransactions : transactions.slice(0, 10)

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Import Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold">{summary.totalTransactions}</div>
                    <div className="text-sm leading-body-sm text-muted-foreground">{t('transactionsLabel')}</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <div>
                    <div className="font-semibold text-success">
                      {formatCurrency(summary.totalCredits)}
                    </div>
                    <div className="text-sm leading-body-sm text-muted-foreground">{t('credits', { count: summary.creditCount })}</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <div>
                    <div className="font-semibold text-destructive">
                      {formatCurrency(summary.totalDebits)}
                    </div>
                    <div className="text-sm leading-body-sm text-muted-foreground">{t('debits', { count: summary.debitCount })}</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <div className={`font-semibold ${summary.totalAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(summary.totalAmount)}
                    </div>
                    <div className="text-sm leading-body-sm text-muted-foreground">{t('netAmount')}</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Account Information */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('importDetails')}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm leading-body-sm">
                <div>
                  <span className="text-muted-foreground">{t('targetAccount')}</span>
                  <span className="ml-2 font-medium">{accountName || accountId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('dateRange')}</span>
                  <span className="ml-2 font-medium">
                    {summary.dateRange.earliest.toLocaleDateString()} - {summary.dateRange.latest.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Category Breakdown */}
            {summary.topCategories.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">{t('categoryBreakdown')}</h3>
                <div className="space-y-2">
                  {summary.topCategories.map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm leading-body-sm">{category}</span>
                      <Badge variant="outline">{count} {t('transactionsBadge')}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Transaction Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg leading-title-5 font-semibold">{t('transactionPreview')}</h3>
                {transactions.length > 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                  >
                    {showAllTransactions ? t('showLess') : t('showAll', { count: transactions.length })}
                  </Button>
                )}
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('headerDate')}</TableHead>
                      <TableHead>{t('headerDescription')}</TableHead>
                      <TableHead className="text-right">{t('headerAmount')}</TableHead>
                      <TableHead>{t('headerCategory')}</TableHead>
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
                        <TableCell className="text-right">
                          <span className={transaction.amount < 0 ? 'text-destructive' : 'text-success'}>
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {transaction.category_id ? (
                            <Badge variant="outline">{transaction.category_id}</Badge>
                          ) : (
                            <span className="text-muted-foreground">{t('uncategorized')}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {totalPages > 1 && (
                  <div className="p-3 text-center text-sm leading-body-sm text-muted-foreground border-t">
                    {t('showing', { shown: paginatedTransactions.length, total: transactions.length })}
                    <div className="flex justify-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        {t('previous')}
                      </Button>
                      <span className="py-1">{t('page', { page, total: totalPages })}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        {t('next')}
                      </Button>
                    </div>
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
                  <div className="font-semibold">{t('alertTitle')}</div>
                  <div className="text-sm leading-body-sm">
                    {t('alertDescription', { count: summary.totalTransactions, account: accountName || 'the selected account' })}
                  </div>
                  <div className="text-sm leading-body-sm text-muted-foreground">
                    {t('alertReview')}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onBack} disabled={isLoading}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('backToPreview')}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('importing')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {t('importButton')}
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
