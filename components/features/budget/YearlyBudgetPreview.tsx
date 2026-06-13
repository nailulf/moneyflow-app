'use client'

import { useTranslations } from 'next-intl'
import { Calendar, CalendarRange } from 'lucide-react'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'
import { getCategoryTint } from '@/lib/category-style'
import { cn } from '@/lib/utils'
import type { PreviewRow } from './BudgetPreviewCard'

interface YearlyBudgetPreviewProps {
  /** e.g. "Annual Budget · 2025" */
  heroLabel: string
  /** Sum of the yearly one-time allocations being created. */
  yearlyTotal: number
  /** Total of the existing monthly plan (recurring). 0 when there's no monthly plan. */
  monthlyTotal: number
  currency: string
  rows: PreviewRow[]
}

// Literal class map — Tailwind JIT sees these verbatim in this file.
// BG tint → FG tint as a background (the vivid fill used for legend dots).
const DOT_CLASSES: Record<string, string> = {
  'bg-tint-blue-bg': 'bg-tint-blue-fg',
  'bg-tint-green-bg': 'bg-tint-green-fg',
  'bg-tint-orange-bg': 'bg-tint-orange-fg',
  'bg-tint-pink-bg': 'bg-tint-pink-fg',
  'bg-tint-teal-bg': 'bg-tint-teal-fg',
  'bg-tint-purple-bg': 'bg-tint-purple-fg',
  'bg-tint-slate-bg': 'bg-tint-slate-fg',
  'bg-tint-amber-bg': 'bg-tint-amber-fg',
}

/**
 * Yearly preview (design `V1A0Po`): navy combined-total hero, budget-type split,
 * and the yearly category breakdown. The grand total combines the recurring
 * monthly plan (×12) with the new yearly one-time allocations.
 */
export function YearlyBudgetPreview({
  heroLabel,
  yearlyTotal,
  monthlyTotal,
  currency,
  rows,
}: YearlyBudgetPreviewProps) {
  const t = useTranslations('budgetCreate')
  const monthlyAnnualized = monthlyTotal * 12
  const grandTotal = monthlyAnnualized + yearlyTotal
  const hasMonthly = monthlyTotal > 0

  return (
    <div className="flex flex-col gap-4">
      {/* ── combined-total hero ─────────────────────────────────────────── */}
      <section className="rounded-[20px] bg-hero-gradient p-5 text-hero-foreground">
        <p className="text-xs leading-caption text-hero-muted">{heroLabel}</p>
        <p className="mt-1 text-3xl font-bold leading-title-2">{formatCurrency(grandTotal, currency)}</p>
        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-hero-foreground/10 pt-3">
          <div className="min-w-0">
            <p className="text-tiny text-hero-muted">{t('yearlyPreview.monthlyTotal')}</p>
            <p className="truncate text-sm leading-body-sm font-semibold">
              {t('yearlyPreview.timesTwelve', { amount: formatCurrencyCompact(monthlyTotal, currency) })}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-tiny text-hero-muted">{t('yearlyPreview.yearlyOnly')}</p>
            <p className="truncate text-sm leading-body-sm font-semibold">
              {formatCurrencyCompact(yearlyTotal, currency)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-tiny text-hero-muted">{t('yearlyPreview.grandTotal')}</p>
            <p className="truncate text-sm leading-body-sm font-semibold text-hero-success">
              {formatCurrencyCompact(grandTotal, currency)}
            </p>
          </div>
        </div>
      </section>

      {/* ── budget type split ───────────────────────────────────────────── */}
      <section className="rounded-2xl bg-card p-4 shadow-card">
        <h2 className="text-sm leading-body-sm font-bold text-foreground">{t('yearlyPreview.splitTitle')}</h2>
        <div className="mt-3 flex flex-col gap-2.5">
          {hasMonthly && (
            <div className="flex items-center gap-3 rounded-xl bg-tint-purple-bg p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card" aria-hidden="true">
                <Calendar className="h-4 w-4 text-tint-purple-fg" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-body-sm font-semibold text-foreground">
                  {t('yearlyPreview.monthlyRecurring')}
                </span>
                <span className="block text-tiny text-muted-foreground">
                  {t('yearlyPreview.perMonth', { amount: formatCurrencyCompact(monthlyTotal, currency) })}
                </span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-xl bg-tint-amber-bg p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card" aria-hidden="true">
              <CalendarRange className="h-4 w-4 text-tint-amber-fg" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-body-sm font-semibold text-foreground">
                {t('yearlyPreview.yearlyOneTime')}
              </span>
              <span className="block text-tiny text-muted-foreground">
                {t('yearlyPreview.perYear', { amount: formatCurrencyCompact(yearlyTotal, currency) })}
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ── yearly categories ───────────────────────────────────────────── */}
      <section className="rounded-2xl bg-card p-4 shadow-card">
        <h2 className="text-sm leading-body-sm font-bold text-foreground">{t('yearlyPreview.categoriesTitle')}</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row.categoryId} className="flex items-center gap-2 text-sm leading-body-sm">
              <span
                className={cn('h-2.5 w-2.5 shrink-0 rounded-full', DOT_CLASSES[getCategoryTint(row.name).bg] ?? 'bg-tint-slate-fg')}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">{row.name}</span>
              <span className="shrink-0 font-semibold text-foreground">{formatCurrencyCompact(row.amount, currency)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
