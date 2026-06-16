'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowRight,
  ChevronLeft,
  PiggyBank,
  Wallet,
  Coins,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

interface BreakdownRow {
  key: string
  icon: LucideIcon
  tint: string
  label: string
  /** Optional sub-line (e.g. savings rate). */
  detail?: string
  amount: number
  /** Render the amount in the over-budget warning color. */
  warn?: boolean
}

/** Budget flow step 4 (design tAKTn) — "Your savings options" result. */
export default function BudgetPlanPage() {
  const t = useTranslations('start')
  const router = useRouter()

  const budgetIncome = useFunnelStore((s) => s.budgetIncome)
  const savingsAmount = useFunnelStore((s) => s.savingsAmount)
  const budgetSpend = useFunnelStore((s) => s.budgetSpend)

  const computed = useMemo(() => {
    const income = budgetIncome ?? 0
    const savings = savingsAmount ?? 0
    const totalSpend = Object.values(budgetSpend).reduce((sum, v) => sum + v, 0)
    const leftover = income - savings - totalSpend
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0
    return { income, savings, totalSpend, leftover, savingsRate }
  }, [budgetIncome, savingsAmount, budgetSpend])

  const { income, savings, totalSpend, leftover, savingsRate } = computed

  // Deep-link guard: no draft → gentle empty state, no NaN/zeros.
  const hasDraft = (budgetIncome ?? 0) > 0 && (savingsAmount ?? 0) > 0
  if (!hasDraft) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tint-blue-bg text-tint-blue-fg">
          <PiggyBank className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl leading-title-4 font-bold text-foreground">
          {t('budget.plan.emptyTitle')}
        </h1>
        <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
          {t('budget.plan.emptySubtitle')}
        </p>
        <Button
          className="mt-6 h-[52px] w-full max-w-xs gap-2 rounded-[14px] text-md"
          onClick={() => router.push('/start/budget/income')}
        >
          {t('budget.plan.emptyCta')}
        </Button>
      </div>
    )
  }

  const rows: BreakdownRow[] = [
    {
      key: 'savings',
      icon: PiggyBank,
      tint: 'bg-tint-blue-bg text-tint-blue-fg',
      label: t('budget.plan.savingsLabel'),
      detail: t('budget.plan.savingsRate', { pct: savingsRate }),
      amount: savings,
    },
    {
      key: 'spending',
      icon: Wallet,
      tint: 'bg-tint-orange-bg text-tint-orange-fg',
      label: t('budget.plan.spendingLabel'),
      amount: totalSpend,
    },
    {
      key: 'leftover',
      icon: Coins,
      tint: 'bg-tint-green-bg text-tint-green-fg',
      label: t('budget.plan.leftoverLabel'),
      detail: leftover < 0 ? t('budget.plan.overBudget') : undefined,
      amount: leftover,
      warn: leftover < 0,
    },
  ]

  return (
    <div className="flex flex-1 flex-col px-5 pb-32">
      <header className="py-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start/budget/spend')}
            aria-label={t('intent.back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <FunnelProgress total={4} current={3} />
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
            {t('budget.plan.title')}
          </h1>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {/* Hero savings card */}
        <div className="rounded-2xl bg-hero-gradient px-5 py-6 text-hero-foreground shadow-floating">
          <span className="inline-flex w-fit items-center rounded-full bg-hero-success/20 px-3 py-1 text-tiny font-bold uppercase tracking-wide text-hero-success">
            {t('budget.plan.savePill')}
          </span>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-4xl leading-title-1 font-bold">
              {formatCurrency(savings)}
            </span>
            <span className="text-md leading-body-lg font-medium text-hero-muted">
              {t('budget.plan.perMonth')}
            </span>
          </p>
          <p className="mt-3 text-sm leading-body-sm text-hero-muted">
            {t('budget.plan.breakdownLine', {
              income: formatCurrency(income),
              spending: formatCurrency(totalSpend),
            })}
          </p>
        </div>

        {/* Breakdown card */}
        <div className="rounded-2xl bg-card px-4 shadow-card">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className={cn(
                'flex items-center gap-3 py-3.5',
                i < rows.length - 1 && 'border-b border-border/60'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]',
                  row.tint
                )}
              >
                <row.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-body-sm font-semibold text-foreground">
                  {row.label}
                </span>
                {row.detail && (
                  <span
                    className={cn(
                      'block text-xs leading-caption',
                      row.warn ? 'text-tint-amber-fg' : 'text-muted-foreground'
                    )}
                  >
                    {row.detail}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'shrink-0 text-md leading-body-lg font-bold',
                  row.warn ? 'text-destructive' : 'text-foreground'
                )}
              >
                {formatCurrency(row.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <div className="pointer-events-auto mx-auto flex max-w-md flex-col items-center gap-3">
          <Button
            className="h-[52px] w-full gap-2 rounded-[14px] text-md"
            onClick={() => router.push('/start/save')}
          >
            {t('budget.plan.saveCta')}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
          <button
            type="button"
            onClick={() => router.push('/start/budget/spend')}
            className="text-sm leading-body-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('budget.plan.adjustLink')}
          </button>
        </div>
      </div>
    </div>
  )
}
