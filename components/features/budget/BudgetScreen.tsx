'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useBudgetSnapshot } from '@/hooks/useBudgetSnapshot'
import { overviewFromSnapshot, categoryRowsFromSnapshot } from '@/lib/budget-screen-utils'
import { SegmentedControl } from '@/components/features/accounts/create/SegmentedControl'
import { BudgetOverview } from './BudgetOverview'
import { CategoryBudgetList } from './CategoryBudgetList'

type PeriodType = 'monthly' | 'yearly'

export function BudgetScreen() {
  const t = useTranslations('budgetTab')
  const locale = useLocale()
  const router = useRouter()
  const [now] = useState(() => new Date())
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  // Monthly cursor: {year, monthIndex 0-11}; yearly cursor reuses year only.
  const [cursor, setCursor] = useState(() => ({ year: now.getFullYear(), monthIndex: now.getMonth() }))

  const isMonthly = periodType === 'monthly'
  const { snapshot, isLoading, noSnapshot } = useBudgetSnapshot(
    periodType, cursor.year, isMonthly ? cursor.monthIndex + 1 : undefined
  )

  const step = (delta: number) => {
    setCursor((c) => {
      if (!isMonthly) return { ...c, year: c.year + delta }
      const d = new Date(c.year, c.monthIndex + delta, 1)
      return { year: d.getFullYear(), monthIndex: d.getMonth() }
    })
  }
  // Allow browsing up to one period ahead (API projects "upcoming").
  const atForwardBound = isMonthly
    ? cursor.year * 12 + cursor.monthIndex >= now.getFullYear() * 12 + now.getMonth() + 1
    : cursor.year >= now.getFullYear() + 1

  const label = isMonthly
    ? new Date(cursor.year, cursor.monthIndex, 1).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
    : String(cursor.year)

  const overview = useMemo(() => (snapshot ? overviewFromSnapshot(snapshot) : null), [snapshot])
  const rows = useMemo(() => (snapshot ? categoryRowsFromSnapshot(snapshot) : []), [snapshot])
  const editable = snapshot?.status !== 'closed'
  const currency = snapshot?.currency ?? 'IDR'

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-3 md:pt-8">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold leading-title-3 text-foreground">{t('title')}</h1>
        <div className="flex items-center gap-0.5 rounded-full bg-card px-1 py-1 shadow-card">
          <button type="button" aria-label={t('prevPeriod')} onClick={() => step(-1)}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted/50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[72px] text-center text-xs leading-caption font-semibold text-foreground">{label}</span>
          <button type="button" aria-label={t('nextPeriod')} onClick={() => step(1)} disabled={atForwardBound}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <SegmentedControl
        options={[
          { value: 'monthly', label: t('monthly') },
          { value: 'yearly', label: t('yearly') },
        ]}
        value={periodType}
        onChange={(v) => setPeriodType(v)}
      />

      {isLoading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="h-32 animate-pulse rounded-2xl bg-card shadow-card" />
          <div className="h-48 animate-pulse rounded-2xl bg-card shadow-card" />
        </div>
      ) : noSnapshot || !snapshot || !overview ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 text-center shadow-card">
          <p className="text-sm leading-body-sm font-bold text-foreground">{t('empty.title')}</p>
          <p className="text-sm leading-body-sm text-muted-foreground">{t('empty.description')}</p>
          <button
            type="button"
            onClick={() => router.push(`/budget/create?period=${periodType}`)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm leading-none font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('empty.cta')}
          </button>
        </div>
      ) : (
        <>
          <BudgetOverview
            data={overview}
            currency={currency}
            editable={editable}
            onEdit={() => router.push(`/budget/edit?period=${periodType}`)}
          />
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-md leading-body-lg font-bold text-foreground">{t('categories.title')}</h2>
            </div>
            <CategoryBudgetList rows={rows} currency={currency} />
          </section>
        </>
      )}
    </div>
  )
}
