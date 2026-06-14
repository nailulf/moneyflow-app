'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import { Skeleton } from '@/components/ui/atoms/skeleton'
import { formatCurrency } from '@/lib/data-utils'
import type { BudgetSnapshotWithSpending } from '@/lib/api/budget-snapshots'
import type { Transaction } from '@/types/database'
import { useTranslations, useLocale } from 'next-intl'

interface BudgetStatusProps {
  timeRange: 'monthly' | 'yearly'
  selectedYear: number
  selectedMonth: number
  snapshot: BudgetSnapshotWithSpending | null
  isLoading: boolean
  noSnapshot: boolean
  error: string | null
  transactions: Transaction[]
}

export function BudgetStatus({
  timeRange,
  selectedYear,
  selectedMonth,
  snapshot,
  isLoading,
  noSnapshot,
  error,
  transactions,
}: BudgetStatusProps) {
  const t = useTranslations('dashboard.budget')
  const locale = useLocale()
  const totalBudget = snapshot?.total_amount || 0
  const currency = snapshot?.currency || 'IDR'

  const totalSpent = useMemo(() => {
    if (snapshot && typeof snapshot.total_spent === 'number') {
      return snapshot.total_spent
    }
    if (!snapshot?.budget_snapshot_categories) return 0
    const budgetCategoryIds = new Set(
      snapshot.budget_snapshot_categories.map(c => c.category_id)
    )
    let total = 0
    for (const tx of transactions) {
      if (tx.type === 'EXPENSE' && tx.category_id && budgetCategoryIds.has(tx.category_id)) {
        total += Math.abs(tx.amount)
      }
    }
    return total
  }, [snapshot, transactions])

  const periodTitle = useMemo(() => {
    if (timeRange === 'yearly') {
      return t('budgetIn', { period: String(selectedYear) })
    }
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString(locale, {
      month: 'long',
    })
    return t('budgetIn', { period: monthName })
  }, [timeRange, selectedYear, selectedMonth, locale, t])

  const rawSpentPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const spentPercent = Math.max(rawSpentPercent, 0)
  const barPercent = Math.min(spentPercent, 100)
  const isOverBudget = spentPercent > 100

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {periodTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 overflow-visible">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : error ? (
          <div className="text-center py-1">
            <p className="text-sm leading-body-sm text-destructive whitespace-nowrap">{t('failedToLoad')}</p>
            <p className="text-sm leading-body-sm text-muted-foreground mt-1 whitespace-nowrap">{error}</p>
          </div>
        ) : noSnapshot ? (
          <div className="text-center py-1">
            <p className="text-sm leading-body-sm text-muted-foreground whitespace-nowrap">{t('noBudgetSet')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm leading-body-sm font-normal tabular-nums whitespace-nowrap">
                {formatCurrency(totalSpent, currency)} of {formatCurrency(totalBudget, currency)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${isOverBudget ? 'bg-destructive' : 'bg-success'}`}
                  style={{ width: `${barPercent}%` }}
                />
              </div>
              <span
                className={`text-sm leading-body-sm tabular-nums whitespace-nowrap ${
                  isOverBudget ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {spentPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
