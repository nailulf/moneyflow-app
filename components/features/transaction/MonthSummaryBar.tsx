'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { formatCurrencyCompact } from '@/lib/data-utils'

interface MonthSummaryBarProps {
  month: { year: number; month: number }
  onMonthChange: (m: { year: number; month: number }) => void
  income: number
  expense: number
}

function step(m: { year: number; month: number }, delta: number) {
  const d = new Date(m.year, m.month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function MonthSummaryBar({ month, onMonthChange, income, expense }: MonthSummaryBarProps) {
  const t = useTranslations('transactions.screen')
  const locale = useLocale()
  const label = new Date(month.year, month.month, 1).toLocaleString(locale, { month: 'short', year: 'numeric' })

  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous month" onClick={() => onMonthChange(step(month, -1))} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <button type="button" aria-label="Next month" onClick={() => onMonthChange(step(month, 1))} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="flex items-center gap-3 text-xs font-medium">
        <span className="text-success">{t('summary.income')} {formatCurrencyCompact(income)}</span>
        <span className="text-destructive">{t('summary.expense')} {formatCurrencyCompact(expense)}</span>
      </div>
    </div>
  )
}
