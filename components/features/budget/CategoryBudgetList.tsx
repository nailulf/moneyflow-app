'use client'

import { createElement } from 'react'
import { useTranslations } from 'next-intl'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'
import type { CategoryBudgetRow } from '@/lib/budget-screen-utils'
import { cn } from '@/lib/utils'

interface CategoryBudgetListProps {
  rows: CategoryBudgetRow[]
  currency: string
}

/** Category budget rows card (design `k1j91` list). */
export function CategoryBudgetList({ rows, currency }: CategoryBudgetListProps) {
  const t = useTranslations('budgetTab')
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-card p-4 text-sm leading-body-sm text-muted-foreground shadow-card">
        {t('categories.empty')}
      </p>
    )
  }
  return (
    <div className="divide-y divide-muted rounded-2xl bg-card shadow-card">
      {rows.map((row) => {
        const tint = getCategoryTint(row.name)
        return (
          <div key={row.categoryId} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tint.bg)} aria-hidden="true">
                {createElement(getCategoryIcon(row.name), { className: cn('h-4 w-4', tint.fg) })}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm leading-body-sm font-semibold text-foreground">{row.name}</span>
                {row.status === 'over' && (
                  <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-tiny font-semibold text-destructive">
                    {t('categories.over')}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="text-sm leading-body-sm font-bold text-foreground">{formatCurrency(row.allocated, currency)}</span>
                <span className="text-tiny text-muted-foreground">
                  {t('categories.spentSub', { amount: formatCurrencyCompact(row.spent, currency) })}
                </span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-muted" role="progressbar"
              aria-label={row.name}
              aria-valuenow={Math.min(row.pct, 100)} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={cn('h-full rounded-sm', row.status === 'over' ? 'bg-destructive' : 'bg-primary')}
                style={{ width: `${Math.min(row.pct, 100)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
