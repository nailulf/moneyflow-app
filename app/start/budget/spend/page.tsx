'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowRight,
  ChevronLeft,
  Home,
  Utensils,
  Car,
  Receipt,
  Sparkles,
  Plus,
  Tag,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { StickyCtaBar } from '@/components/features/budget/StickyCtaBar'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

/**
 * The design's FIXED cost-of-living categories (BU3). These differ from the
 * app's seeded categories (Food & Dining, Transportation, …); we match the
 * design here and find-or-create against the real categories at save time on
 * the plan screen. `labelKey` resolves to the localized name.
 */
interface SpendCategory {
  key: string
  labelKey: string
  icon: LucideIcon
  tint: { bg: string; fg: string }
}

const SPEND_CATEGORIES: SpendCategory[] = [
  { key: 'housing', labelKey: 'housing', icon: Home, tint: { bg: 'bg-tint-blue-bg', fg: 'text-tint-blue-fg' } },
  { key: 'food', labelKey: 'food', icon: Utensils, tint: { bg: 'bg-tint-green-bg', fg: 'text-tint-green-fg' } },
  { key: 'transport', labelKey: 'transport', icon: Car, tint: { bg: 'bg-tint-orange-bg', fg: 'text-tint-orange-fg' } },
  { key: 'bills', labelKey: 'bills', icon: Receipt, tint: { bg: 'bg-tint-slate-bg', fg: 'text-tint-slate-fg' } },
  { key: 'lifestyle', labelKey: 'lifestyle', icon: Sparkles, tint: { bg: 'bg-tint-pink-bg', fg: 'text-tint-pink-fg' } },
]

/** Budget flow step 3 (design tAKTn / BU3) — estimate monthly cost of living. */
export default function BudgetSpendPage() {
  const t = useTranslations('start')
  const router = useRouter()

  const budgetSpend = useFunnelStore((s) => s.budgetSpend)
  const setBudgetSpend = useFunnelStore((s) => s.setBudgetSpend)

  // Extra user-added rows beyond the fixed design list (v1: generic rows).
  const [extraRows, setExtraRows] = useState<{ key: string; label: string }[]>([])

  const allRows = useMemo(
    () => [
      ...SPEND_CATEGORIES.map((c) => ({
        key: c.key,
        label: t(`budget.spend.categories.${c.labelKey}`),
        icon: c.icon,
        tint: c.tint,
      })),
      ...extraRows.map((r) => ({
        key: r.key,
        label: r.label,
        icon: Tag,
        tint: { bg: 'bg-tint-teal-bg', fg: 'text-tint-teal-fg' },
      })),
    ],
    [extraRows, t]
  )

  const total = allRows.reduce((sum, r) => sum + (budgetSpend[r.key] ?? 0), 0)

  const addRow = () => {
    const key = `extra-${extraRows.length + 1}`
    setExtraRows((prev) => [...prev, { key, label: t('budget.spend.newCategory') }])
  }

  const handleSeeOptions = () => {
    router.push('/start/budget/plan')
  }

  return (
    <div className="flex flex-1 flex-col px-5">
      <header className="py-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start/budget/savings')}
            aria-label={t('intent.back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <FunnelProgress total={5} current={3} />
          <button
            type="button"
            onClick={() => router.push('/')}
            className="shrink-0 text-sm leading-body-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('intent.skip')}
          </button>
        </div>

        <div className="mt-6">
          <h1 className="text-2xl leading-title-3 font-bold text-foreground">
            {t('budget.spend.title')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('budget.spend.subtitle')}
          </p>
        </div>
      </header>

      {/* Single card holding the category rows */}
      <div className="mt-2 rounded-2xl bg-card px-4 shadow-card">
        {allRows.map((row, i) => (
          <div
            key={row.key}
            className={cn(
              'flex items-center gap-3 py-3',
              i < allRows.length - 1 && 'border-b border-border/60'
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]',
                row.tint.bg,
                row.tint.fg
              )}
            >
              <row.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-md leading-body-lg font-medium text-foreground">
              {row.label}
            </span>
            <CurrencyInput
              data-testid={`budget-spend-${row.key}`}
              aria-label={row.label}
              value={budgetSpend[row.key] ?? 0}
              onChange={(v) => setBudgetSpend(row.key, v)}
              className="h-9 w-[116px] rounded-[10px] border-transparent bg-muted/40 pl-7 pr-2 text-right text-sm font-semibold focus-visible:bg-card"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="flex w-full items-center justify-center gap-1.5 py-3.5 text-sm leading-body-sm font-semibold text-primary hover:text-primary/80"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('budget.spend.addCategory')}
        </button>
      </div>

      {/* Navy summary row — cost of living today */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-hero-gradient px-4 py-4 text-hero-foreground shadow-floating">
        <Wallet className="h-5 w-5 shrink-0 text-hero-muted" aria-hidden="true" />
        <span className="flex-1 text-sm leading-body-sm font-medium text-hero-muted">
          {t('budget.spend.totalLabel')}
        </span>
        <span className="text-lg leading-title-5 font-bold">{formatCurrency(total)}</span>
      </div>

      <StickyCtaBar>
        <Button
          className="h-[52px] w-full gap-2 rounded-[14px] text-md"
          onClick={handleSeeOptions}
        >
          {t('budget.spend.cta')}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </StickyCtaBar>
    </div>
  )
}
