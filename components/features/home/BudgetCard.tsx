'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Calendar, CircleCheck, CircleAlert, Wallet } from 'lucide-react'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

interface BudgetCardProps {
  monthLabel: string
  spent: number
  total: number
  currency: string
}

/** Monthly budget card (design `kejuQ`). total === 0 → empty state. */
export function BudgetCard({ monthLabel, spent, total, currency }: BudgetCardProps) {
  const t = useTranslations('home')
  const pct = total > 0 ? Math.round((spent / total) * 100) : 0
  const over = total > 0 && spent > total
  const left = Math.max(0, total - spent)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-md leading-body-lg font-bold text-foreground">
          {t('budget.title', { month: monthLabel })}
        </h2>
        <Link href="/budget" className="text-sm leading-body-sm text-primary">{t('budget.viewAll')}</Link>
      </div>
      <div className="rounded-2xl bg-card p-4 shadow-card">
        {total === 0 ? (
          <p className="text-sm leading-body-sm text-muted-foreground">{t('budget.noBudget')}</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 rounded-2xl bg-muted px-2.5 py-1 text-xs leading-caption font-semibold text-muted-foreground">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {monthLabel}
              </span>
              <span className={cn(
                'flex items-center gap-1 rounded-2xl px-2.5 py-1 text-xs leading-caption font-semibold',
                over ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
              )}>
                {over ? <CircleAlert className="h-3 w-3" aria-hidden="true" /> : <CircleCheck className="h-3 w-3" aria-hidden="true" />}
                {over ? t('budget.overBudget') : t('budget.onTrack')}
              </span>
            </div>
            <p className="mt-3 flex items-end gap-1.5">
              <span className="text-2xl font-bold leading-title-4 text-foreground">{formatCurrency(spent, currency)}</span>
              <span className="text-sm leading-body-sm text-muted-foreground">
                {t('budget.of', { amount: formatCurrencyCompact(total, currency) })}
              </span>
            </p>
            <div className="mt-2.5 h-3 overflow-hidden rounded-md bg-border" role="progressbar"
              aria-label={t('budget.used', { pct })}
              aria-valuenow={Math.min(pct, 100)} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={cn('h-full rounded-md', over ? 'bg-destructive' : 'bg-primary')}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs leading-caption text-muted-foreground">{t('budget.used', { pct })}</span>
              <span className="flex items-center gap-1 rounded-xl bg-selected px-2.5 py-0.5 text-xs leading-caption font-semibold text-selected-foreground">
                <Wallet className="h-3 w-3" aria-hidden="true" />
                {t('budget.left', { amount: formatCurrencyCompact(left, currency) })}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
