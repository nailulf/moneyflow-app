'use client'

import { useTranslations } from 'next-intl'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'
import { getCategoryTint } from '@/lib/category-style'
import { cn } from '@/lib/utils'

export interface PreviewRow {
  categoryId: string
  name: string
  amount: number
  pct: number
}

interface BudgetPreviewCardProps {
  periodLabel: string
  total: number
  income: number
  currency: string
  rows: PreviewRow[]
}

// Literal class map — Tailwind JIT sees these verbatim in this file.
// BG tint → FG tint as a background (more vivid fill for the stacked bar).
const SEGMENT_CLASSES: Record<string, string> = {
  'bg-tint-blue-bg': 'bg-tint-blue-fg',
  'bg-tint-green-bg': 'bg-tint-green-fg',
  'bg-tint-orange-bg': 'bg-tint-orange-fg',
  'bg-tint-pink-bg': 'bg-tint-pink-fg',
  'bg-tint-teal-bg': 'bg-tint-teal-fg',
  'bg-tint-purple-bg': 'bg-tint-purple-fg',
  'bg-tint-slate-bg': 'bg-tint-slate-fg',
  'bg-tint-amber-bg': 'bg-tint-amber-fg',
}

/** Budget preview (design `DDhxR`): navy summary + category breakdown. */
export function BudgetPreviewCard({ periodLabel, total, income, currency, rows }: BudgetPreviewCardProps) {
  const t = useTranslations('budgetCreate')
  const savings = Math.max(0, income - total)
  const ofIncome = income > 0 ? Math.round((total / income) * 100) : 0
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[20px] bg-hero-gradient p-5 text-hero-foreground">
        <p className="text-xs leading-caption text-hero-muted">{periodLabel}</p>
        <p className="mt-1 text-3xl font-bold leading-title-2">{formatCurrency(total, currency)}</p>
        <div className="mt-3 flex gap-4 border-t border-hero-foreground/10 pt-3">
          <div className="min-w-0">
            <p className="text-tiny text-hero-muted">{t('preview.income')}</p>
            <p className="truncate text-sm leading-body-sm font-semibold">{formatCurrencyCompact(income, currency)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-tiny text-hero-muted">{t('preview.budgeted')}</p>
            <p className="truncate text-sm leading-body-sm font-semibold">{formatCurrencyCompact(total, currency)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-tiny text-hero-muted">{t('preview.savings')}</p>
            <p className="truncate text-sm leading-body-sm font-semibold text-hero-success">{formatCurrencyCompact(savings, currency)}</p>
          </div>
        </div>
      </section>
      <section className="rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm leading-body-sm font-bold text-foreground">{t('preview.breakdown')}</h2>
          <span className="text-xs leading-caption font-semibold text-muted-foreground">
            {t('preview.ofIncome', { pct: ofIncome })}
          </span>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {rows.map((row) => (
            <div
              key={row.categoryId}
              className={cn('h-full', SEGMENT_CLASSES[getCategoryTint(row.name).bg] ?? 'bg-tint-slate-fg')}
              style={{ width: `${row.pct}%` }}
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.categoryId} className="flex items-center justify-between gap-2 text-sm leading-body-sm">
              <span className="min-w-0 truncate font-medium text-foreground">{row.name}</span>
              <span className="shrink-0 text-muted-foreground">
                <span className="font-semibold text-foreground">{row.pct}%</span> · {formatCurrencyCompact(row.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
