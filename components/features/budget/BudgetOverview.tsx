'use client'

import { useTranslations } from 'next-intl'
import { Pencil } from 'lucide-react'
import { formatCurrency } from '@/lib/data-utils'
import type { BudgetOverviewData } from '@/lib/budget-screen-utils'
import { cn } from '@/lib/utils'

interface BudgetOverviewProps {
  data: BudgetOverviewData
  currency: string
  editable: boolean
  onEdit: () => void
}

/** Period overview card (design `k1j91` top card). */
export function BudgetOverview({ data, currency, editable, onEdit }: BudgetOverviewProps) {
  const t = useTranslations('budgetTab')
  return (
    <section className="rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm leading-body-sm font-bold text-foreground">{t('overview.title')}</h2>
        {editable && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 rounded-full bg-selected px-2.5 py-1 text-xs leading-caption font-semibold text-selected-foreground transition-colors hover:bg-selected/80"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            {t('overview.edit')}
          </button>
        )}
      </div>
      <div className="mt-3 flex gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-tiny text-muted-foreground">{t('overview.budget')}</p>
          <p className="truncate text-sm leading-body-sm font-bold text-foreground">{formatCurrency(data.budget, currency)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-tiny text-muted-foreground">{t('overview.spent')}</p>
          <p className="truncate text-sm leading-body-sm font-bold text-destructive">{formatCurrency(data.spent, currency)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-tiny text-muted-foreground">{t('overview.left')}</p>
          <p className="truncate text-sm leading-body-sm font-bold text-success">{formatCurrency(data.left, currency)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <div
          className="h-3 flex-1 overflow-hidden rounded-md bg-border"
          role="progressbar"
          aria-label={t('overview.used', { pct: data.pct })}
          aria-valuenow={Math.min(data.pct, 100)} aria-valuemin={0} aria-valuemax={100}
        >
          <div
            className={cn('h-full rounded-md', data.over ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${Math.min(data.pct, 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-xs leading-caption font-semibold text-muted-foreground">
          {t('overview.used', { pct: data.pct })}
        </span>
      </div>
    </section>
  )
}
