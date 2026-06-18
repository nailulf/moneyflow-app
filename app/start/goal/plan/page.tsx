'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import {
  ArrowRight,
  ChevronLeft,
  Scissors,
  Briefcase,
  Target,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  Plane,
  Smartphone,
  CreditCard,
  Pencil,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { ConversionCtaBlock } from '@/components/features/onboarding/funnel/ConversionCtaBlock'
import { useFunnelStore, type FunnelGoalType } from '@/lib/onboarding/funnel-store'
import { monthsToGoal } from '@/lib/onboarding/plan-math'
import { formatCurrencyCompact, formatCurrencyWhole } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

/** Friendly goal label keys (reuse the type-screen titles). */
const GOAL_LABEL_KEY: Record<FunnelGoalType, string> = {
  emergency_fund: 'goal.type.emergencyTitle',
  vacation: 'goal.type.vacationTitle',
  gadget: 'goal.type.gadgetTitle',
  debt_payoff: 'goal.type.debtTitle',
  custom: 'goal.type.customTitle',
}

/** Goal-type icon + tint (mirrors the type screen's cards). */
const GOAL_VISUAL: Record<FunnelGoalType, { icon: LucideIcon; tint: string }> = {
  emergency_fund: { icon: ShieldCheck, tint: 'bg-tint-green-bg text-tint-green-fg' },
  vacation: { icon: Plane, tint: 'bg-tint-blue-bg text-tint-blue-fg' },
  gadget: { icon: Smartphone, tint: 'bg-tint-amber-bg text-tint-amber-fg' },
  debt_payoff: { icon: CreditCard, tint: 'bg-tint-pink-bg text-tint-pink-fg' },
  custom: { icon: Pencil, tint: 'bg-tint-slate-bg text-tint-slate-fg' },
}

const SIDE_INCOME_HINT = 500_000

/** today + N months, formatted as "MMM YYYY" in the active locale. */
function targetMonthLabel(months: number, locale: string): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' })
}

/** Goal flow screen 4 (design Row B-4) — the "Plan ready" summary. */
export default function GoalPlanPage() {
  const t = useTranslations('start')
  const locale = useLocale()
  const router = useRouter()

  const goalType = useFunnelStore((s) => s.goalType)
  const targetAmount = useFunnelStore((s) => s.targetAmount)
  const horizonMonths = useFunnelStore((s) => s.horizonMonths)
  const monthlyIncome = useFunnelStore((s) => s.monthlyIncome)
  const incomeSources = useFunnelStore((s) => s.incomeSources)
  const spend = useFunnelStore((s) => s.spend)

  const computed = useMemo(() => {
    const income =
      (monthlyIncome ?? 0) + incomeSources.reduce((sum, s) => sum + s.amount, 0)
    const totalSpend = Object.values(spend).reduce((sum, v) => sum + v, 0)
    const surplus = Math.max(0, income - totalSpend)
    const target = targetAmount ?? 0
    const months = monthsToGoal(target, surplus)
    const achievable = Number.isFinite(months) && months <= (horizonMonths ?? 12)
    return { income, totalSpend, surplus, target, months, achievable }
  }, [monthlyIncome, incomeSources, spend, targetAmount, horizonMonths])

  const { income, totalSpend, surplus, target, months, achievable } = computed

  // "What if?" hints — only meaningful when there's a surplus and a target.
  const whatIf = useMemo(() => {
    if (surplus <= 0 || target <= 0) return []
    const rows: Array<{ key: string; icon: LucideIcon; label: string; months: number }> = []
    const cutAmount = Math.round(0.1 * totalSpend)
    if (cutAmount > 0) {
      rows.push({
        key: 'cut',
        icon: Scissors,
        label: t('goal.plan.whatIfCut', { amount: formatCurrencyCompact(cutAmount) }),
        months: monthsToGoal(target, surplus + cutAmount),
      })
    }
    rows.push({
      key: 'side',
      icon: Briefcase,
      label: t('goal.plan.whatIfSide', { amount: formatCurrencyCompact(SIDE_INCOME_HINT) }),
      months: monthsToGoal(target, surplus + SIDE_INCOME_HINT),
    })
    return rows
  }, [surplus, target, totalSpend, t])

  // Deep-link guard: no draft → gentle empty state, no NaN/zeros.
  const hasDraft = (targetAmount ?? 0) > 0 && (monthlyIncome ?? 0) > 0
  if (!hasDraft) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tint-blue-bg text-tint-blue-fg">
          <Target className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl leading-title-4 font-bold text-foreground">
          {t('goal.plan.emptyTitle')}
        </h1>
        <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
          {t('goal.plan.emptySubtitle')}
        </p>
        <Button
          className="mt-6 h-[52px] w-full max-w-xs gap-2 rounded-[14px] text-md"
          onClick={() => router.push('/start/goal/type')}
        >
          {t('goal.plan.emptyCta')}
        </Button>
      </div>
    )
  }

  const goalVisual = goalType ? GOAL_VISUAL[goalType] : GOAL_VISUAL.custom
  const GoalIcon = goalVisual.icon

  return (
    <div className="flex flex-1 flex-col px-5 pb-32">
      <header className="pt-5 pb-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start/goal/spend')}
            aria-label={t('intent.back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <FunnelProgress total={4} current={3} />
          {/* No Skip on the plan-ready screen — the conversion moment. Spacer
              keeps the progress centered. */}
          <span className="h-9 w-9 shrink-0" aria-hidden="true" />
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {/* Hero surplus card */}
        <div className="rounded-2xl bg-hero-gradient px-5 py-6 text-hero-foreground shadow-floating">
          {/* "You can save" pill */}
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-card/15 px-3 py-1 text-tiny font-semibold uppercase tracking-wide text-hero-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t('goal.plan.savePill')}
          </span>

          <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-3xl leading-title-2 font-bold">{formatCurrencyWhole(surplus)}</span>
            <span className="text-md leading-body-lg font-medium text-hero-muted">
              {t('goal.plan.perMonth')}
            </span>
          </p>

          <div className="my-4 h-px w-full bg-hero-foreground/15" />

          <p className="text-sm leading-body-sm text-hero-muted">
            {t('goal.plan.incomeLabel')} {formatCurrencyCompact(income)}
            <span className="px-1.5" aria-hidden="true">
              —
            </span>
            {t('goal.plan.expensesLabel')} {formatCurrencyCompact(totalSpend)}
          </p>
        </div>

        {/* Goal card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]',
                goalVisual.tint
              )}
            >
              <GoalIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-md leading-body-lg font-semibold text-foreground">
                {t('goal.plan.goalLabel', {
                  name: goalType ? t(GOAL_LABEL_KEY[goalType]) : t('goal.type.customTitle'),
                })}
              </p>
              <p className="text-sm leading-body-sm text-muted-foreground">
                {formatCurrencyWhole(target)}
              </p>
            </div>
          </div>

          {/* Progress track — fill minimal (nothing saved yet), with a round knob. */}
          <div className="relative mt-4 h-2 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: '4%' }}
            />
            <span
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-card shadow-card"
              style={{ left: '4%' }}
              aria-hidden="true"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm leading-body-sm text-muted-foreground">
              {Number.isFinite(months)
                ? t('goal.plan.reachIn', {
                    months,
                    date: targetMonthLabel(months, locale),
                  })
                : t('goal.plan.noSurplus')}
            </p>
            {Number.isFinite(months) && (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-tiny font-semibold',
                  achievable
                    ? 'bg-success/10 text-success'
                    : 'bg-tint-amber-bg text-tint-amber-fg'
                )}
              >
                {achievable ? t('goal.plan.achievable') : t('goal.plan.tight')}
              </span>
            )}
          </div>
        </div>

        {/* What if? */}
        {whatIf.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="flex items-center gap-2 text-sm leading-body-sm font-semibold text-foreground">
              <Lightbulb className="h-4 w-4 text-tint-amber-fg" aria-hidden="true" />
              {t('goal.plan.whatIfTitle')}
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {whatIf.map((row) => (
                <div key={row.key} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-blue-bg text-tint-blue-fg">
                    <row.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-body-sm text-foreground">
                    {row.label}
                  </span>
                  <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-tiny font-semibold text-success">
                    {t('goal.plan.whatIfMonths', { months: row.months })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA — this result screen is the conversion point */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <div className="pointer-events-auto mx-auto flex max-w-md flex-col items-center gap-3">
          <ConversionCtaBlock />
          <button
            type="button"
            onClick={() => router.push('/start/goal/spend')}
            className="text-sm leading-body-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('goal.plan.adjustLink')}
          </button>
        </div>
      </div>
    </div>
  )
}
