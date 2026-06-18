'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Smile,
  Target,
  Flame,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { ConversionCtaBlock } from '@/components/features/onboarding/funnel/ConversionCtaBlock'
import { StickyCtaBar } from '@/components/features/budget/StickyCtaBar'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

type OptionKey = 'relaxed' | 'on_target' | 'ambitious'

interface PlanOption {
  key: OptionKey
  icon: LucideIcon
  tint: { bg: string; fg: string }
  title: string
  subtitle: string
  amount: number
  recommended?: boolean
}

/** Budget flow step 4 (design tAKTn / BU4) — "Your savings options". */
export default function BudgetPlanPage() {
  const t = useTranslations('start')
  const router = useRouter()

  const budgetIncome = useFunnelStore((s) => s.budgetIncome)
  const savingsAmount = useFunnelStore((s) => s.savingsAmount)
  const budgetSpend = useFunnelStore((s) => s.budgetSpend)
  const setBudgetSavingsChoice = useFunnelStore((s) => s.setBudgetSavingsChoice)

  const [selected, setSelected] = useState<OptionKey>('on_target')

  const computed = useMemo(() => {
    const income = budgetIncome ?? 0
    const savings = savingsAmount ?? 0
    const totalSpend = Object.values(budgetSpend).reduce((sum, v) => sum + v, 0)
    const available = Math.max(0, income - totalSpend)
    const onTrack = savings <= available

    const relaxed = available
    const onTarget = savings
    const ambitious = onTrack
      ? Math.round(available + 0.15 * income)
      : Math.max(savings, 2 * savings - available)

    const pct = (amt: number) => (income > 0 ? Math.round((amt / income) * 100) : 0)

    return { income, savings, totalSpend, available, onTrack, relaxed, onTarget, ambitious, pct }
  }, [budgetIncome, savingsAmount, budgetSpend])

  const { income, totalSpend, available, onTrack, relaxed, onTarget, ambitious, pct } = computed

  // Keep the funnel draft's savings choice in sync with the selected option so
  // the conversion CTA can route straight to signup (finalize reads the store).
  // Declared before the deep-link early return to keep hook order stable.
  useEffect(() => {
    const amt = selected === 'relaxed' ? relaxed : selected === 'ambitious' ? ambitious : onTarget
    setBudgetSavingsChoice(amt)
  }, [selected, relaxed, onTarget, ambitious, setBudgetSavingsChoice])

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

  const trim1 = Math.max(0, onTarget - available)
  const trim2 = Math.max(0, ambitious - available)

  const options: PlanOption[] = [
    {
      key: 'relaxed',
      icon: Smile,
      tint: { bg: 'bg-tint-slate-bg', fg: 'text-tint-slate-fg' },
      title: t('budget.plan.relaxedTitle'),
      subtitle: onTrack
        ? t('budget.plan.relaxedOnTrackSubtitle')
        : t('budget.plan.relaxedSubtitle'),
      amount: relaxed,
    },
    {
      key: 'on_target',
      icon: Target,
      tint: { bg: 'bg-tint-blue-bg', fg: 'text-tint-blue-fg' },
      title: t('budget.plan.onTargetTitle'),
      subtitle: onTrack
        ? t('budget.plan.onTargetOnTrackSubtitle')
        : t('budget.plan.onTargetSubtitle', { amount: formatCurrencyCompact(trim1) }),
      amount: onTarget,
      recommended: true,
    },
    {
      key: 'ambitious',
      icon: Flame,
      tint: { bg: 'bg-tint-orange-bg', fg: 'text-tint-orange-fg' },
      title: t('budget.plan.ambitiousTitle'),
      subtitle: onTrack
        ? t('budget.plan.ambitiousOnTrackSubtitle')
        : t('budget.plan.ambitiousSubtitle', { amount: formatCurrencyCompact(trim2) }),
      amount: ambitious,
    },
  ]

  const selectedAmount = options.find((o) => o.key === selected)?.amount ?? onTarget

  const summary = [
    { label: t('budget.plan.summaryIncome'), value: formatCurrencyCompact(income), tone: 'text-foreground' },
    { label: t('budget.plan.summarySpending'), value: formatCurrencyCompact(totalSpend), tone: 'text-destructive' },
    { label: t('budget.plan.summaryAvailable'), value: formatCurrencyCompact(available), tone: 'text-success' },
  ]

  return (
    <div className="flex flex-1 flex-col px-5">
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
          <FunnelProgress total={5} current={4} />
          {/* No Skip on the savings-options screen — the conversion moment.
              Spacer keeps the progress centered. */}
          <span className="h-9 w-9 shrink-0" aria-hidden="true" />
        </div>

        <div className="mt-6">
          <h1 className="text-2xl leading-title-3 font-bold text-foreground">
            {t('budget.plan.title')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('budget.plan.subtitle', {
              income: formatCurrencyCompact(income),
              spending: formatCurrencyCompact(totalSpend),
            })}
          </p>
        </div>
      </header>

      {/* Summary strip — Income · Spending · Available */}
      <div className="mt-2 flex items-stretch rounded-2xl bg-card px-2 py-3 shadow-card">
        {summary.map((col, i) => (
          <div
            key={col.label}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 px-1',
              i < summary.length - 1 && 'border-r border-border/60'
            )}
          >
            <span className="text-xs leading-caption text-muted-foreground">{col.label}</span>
            <span className={cn('text-sm leading-body-sm font-bold', col.tone)}>{col.value}</span>
          </div>
        ))}
      </div>

      {/* Choose how hard to save */}
      <p className="mt-5 text-sm leading-body-sm font-bold text-foreground">
        {t('budget.plan.chooseLabel')}
      </p>
      <div className="mt-2 flex flex-col gap-2.5">
        {options.map((opt) => {
          const isActive = selected === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setSelected(opt.key)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left transition-colors',
                isActive ? 'border-primary bg-selected' : 'border-transparent shadow-card'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]',
                  opt.tint.bg,
                  opt.tint.fg
                )}
              >
                <opt.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="whitespace-nowrap text-md leading-body-lg font-semibold text-foreground">
                    {opt.title}
                  </span>
                  {opt.recommended && (
                    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-tint-green-bg px-1.5 py-0.5 text-nano font-bold uppercase tracking-wide text-tint-green-fg">
                      {t('budget.plan.recommended')}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-caption text-muted-foreground">
                  {opt.subtitle}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-md leading-body-lg font-bold text-foreground">
                  {formatCurrencyCompact(opt.amount)}
                </span>
                <span className="block text-tiny font-medium text-muted-foreground">
                  {t('budget.plan.percentOfIncome', { pct: pct(opt.amount) })}
                </span>
              </span>
            </button>
          )
        })}

        {/* Action row — build a specific budget by category */}
        <button
          type="button"
          onClick={() => router.push('/start/budget/spend')}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-md leading-body-lg font-semibold text-foreground">
              {t('budget.plan.specificTitle')}
            </span>
            <span className="mt-0.5 block text-xs leading-caption text-muted-foreground">
              {t('budget.plan.specificSubtitle')}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>

      <StickyCtaBar>
        <ConversionCtaBlock />
      </StickyCtaBar>
    </div>
  )
}
