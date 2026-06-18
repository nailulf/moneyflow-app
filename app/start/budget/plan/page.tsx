'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft, PiggyBank, Target, PartyPopper, Check } from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { ConversionCtaBlock } from '@/components/features/onboarding/funnel/ConversionCtaBlock'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { ONBOARDING_SPEND_CATEGORIES } from '@/lib/onboarding/spend-categories'
import { buildBudgetTrimPlan } from '@/lib/onboarding/plan-math'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

/**
 * Budget flow step 4 (design QlVbR / BU4) — "How to hit your goal".
 *
 * The savings TARGET set on /start/budget/savings is fixed. This screen shows
 * how much is already free, the gap to the target, and which categories to trim
 * to close it (smart caps, Housing never). The trims become the budget; the
 * savings allocation sticks to the target.
 */
export default function BudgetPlanPage() {
  const t = useTranslations('start')
  const router = useRouter()

  const budgetIncome = useFunnelStore((s) => s.budgetIncome)
  const savingsAmount = useFunnelStore((s) => s.savingsAmount)
  const budgetSpend = useFunnelStore((s) => s.budgetSpend)
  const customCategories = useFunnelStore((s) => s.customCategories)
  const setBudgetSpend = useFunnelStore((s) => s.setBudgetSpend)
  const setBudgetSavingsChoice = useFunnelStore((s) => s.setBudgetSavingsChoice)

  const income = budgetIncome ?? 0
  const savingsGoal = savingsAmount ?? 0

  const plan = useMemo(() => {
    const categories = [
      ...ONBOARDING_SPEND_CATEGORIES.map((c) => ({ slug: c.slug, name: c.name })),
      ...customCategories,
    ]
      .map((c) => ({ slug: c.slug, name: c.name, amount: budgetSpend[c.slug] ?? 0 }))
      .filter((c) => c.amount > 0)
    return buildBudgetTrimPlan({ income, savingsGoal, categories })
  }, [income, savingsGoal, budgetSpend, customCategories])

  // Pre-checked trims (the fewest that close the gap); user can toggle any.
  const [applied, setApplied] = useState<Set<string>>(() => new Set(plan.preselected))

  const appliedTrim = plan.suggestions
    .filter((s) => applied.has(s.slug))
    .reduce((sum, s) => sum + s.trim, 0)
  const onTrack = plan.gap === 0
  const willHit = onTrack || appliedTrim >= plan.gap
  // Stick to the target when reachable; otherwise the best the trims can do.
  const committedSavings = Math.min(savingsGoal, plan.freeNow + appliedTrim)
  const shortfall = Math.max(0, savingsGoal - (plan.freeNow + appliedTrim))

  // Keep the draft's savings choice in sync so the conversion CTA can route
  // straight to signup. Declared before the deep-link return for stable hooks.
  useEffect(() => {
    setBudgetSavingsChoice(committedSavings)
  }, [committedSavings, setBudgetSavingsChoice])

  const toggle = (slug: string) =>
    setApplied((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })

  // Commit the trimmed amounts as the budget before leaving toward signup or
  // the manual-adjust screen, so finalize materializes the trimmed plan.
  const commitPlan = () => {
    for (const s of plan.suggestions) {
      setBudgetSpend(s.slug, applied.has(s.slug) ? s.suggested : s.current)
    }
    setBudgetSavingsChoice(committedSavings)
  }

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

  // Progress-bar segments (as % of the goal): already-free, just-trimmed, still-needed.
  const pctOfGoal = (v: number) => (savingsGoal > 0 ? Math.min(100, (v / savingsGoal) * 100) : 0)
  const freeWidth = pctOfGoal(plan.freeNow)
  const trimmedWidth = pctOfGoal(Math.min(appliedTrim, plan.gap))
  const remainingWidth = Math.max(0, 100 - freeWidth - trimmedWidth)

  return (
    <div className="flex flex-1 flex-col px-5 pb-44">
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
          {/* No Skip at the conversion moment. Spacer keeps the progress centered. */}
          <span className="h-9 w-9 shrink-0" aria-hidden="true" />
        </div>

        <div className="mt-6">
          <h1 className="text-2xl leading-title-3 font-bold text-foreground">
            {t('budget.plan.trimTitle')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {onTrack
              ? t('budget.plan.trimSubtitleOnTrack', {
                  free: formatCurrencyCompact(plan.freeNow),
                  goal: formatCurrencyCompact(savingsGoal),
                })
              : t('budget.plan.trimSubtitleGap', {
                  goal: formatCurrencyCompact(savingsGoal),
                  free: formatCurrencyCompact(plan.freeNow),
                })}
          </p>
        </div>
      </header>

      {/* Savings-goal hero card with the free/trim progress bar */}
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint-blue-bg text-tint-blue-fg">
            <Target className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-md leading-body-lg font-semibold text-foreground">
            {t('budget.plan.savingsGoalLabel')}
          </span>
          <span className="shrink-0 text-xl leading-title-4 font-bold text-foreground">
            {formatCurrencyCompact(savingsGoal)}
          </span>
        </div>

        <div className="mt-3.5 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${freeWidth}%` }} />
          <div className="h-full bg-success transition-[width]" style={{ width: `${trimmedWidth}%` }} />
          <div className="h-full bg-tint-amber-fg transition-[width]" style={{ width: `${remainingWidth}%` }} />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-caption">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            {t('budget.plan.freeNowLegend', { amount: formatCurrencyCompact(plan.freeNow) })}
          </span>
          {onTrack ? (
            <span className="flex items-center gap-1.5 text-success">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              {t('budget.plan.onTrackLegend')}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-tint-amber-fg" aria-hidden="true" />
              {t('budget.plan.needTrimLegend', { amount: formatCurrencyCompact(plan.gap) })}
            </span>
          )}
        </div>
      </div>

      {/* Trim suggestions */}
      {plan.suggestions.length > 0 && (
        <>
          <p className="mt-5 text-sm leading-body-sm font-bold text-foreground">
            {onTrack ? t('budget.plan.trimSectionOptional') : t('budget.plan.trimSectionTitle')}
          </p>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {plan.suggestions.map((s) => {
              const Icon = getCategoryIcon(s.name)
              const tint = getCategoryTint(s.name)
              const isOn = applied.has(s.slug)
              return (
                <button
                  key={s.slug}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => toggle(s.slug)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition-colors',
                    isOn ? 'border-success' : 'border-border'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
                      tint.bg,
                      tint.fg
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm leading-body-sm font-normal text-foreground">
                      {s.name}
                    </span>
                    <span className="block text-xs leading-caption text-muted-foreground">
                      {formatCurrencyCompact(s.current)} → {formatCurrencyCompact(s.suggested)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-tint-green-bg px-2 py-0.5 text-tiny font-bold text-tint-green-fg">
                    −{formatCurrencyCompact(s.trim)}
                  </span>
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                      isOn ? 'border-success bg-success text-success-foreground' : 'border-border'
                    )}
                  >
                    {isOn && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Outcome callout — the primary takeaway */}
      <div
        className={cn(
          'mt-4 flex gap-2.5 rounded-2xl p-3.5',
          willHit ? 'bg-tint-green-bg' : 'bg-muted/60'
        )}
      >
        <PartyPopper
          className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', willHit ? 'text-tint-green-fg' : 'text-muted-foreground')}
          aria-hidden="true"
        />
        <span className="min-w-0">
          {willHit ? (
            <>
              <span className="block text-sm leading-body-sm font-bold text-tint-green-fg">
                {onTrack && appliedTrim === 0
                  ? t('budget.plan.onTrackTitle')
                  : t('budget.plan.willHitTitle', { amount: formatCurrencyCompact(savingsGoal) })}
              </span>
              <span className="block text-xs leading-caption text-tint-green-fg/80">
                {onTrack && appliedTrim === 0
                  ? t('budget.plan.onTrackBody', { amount: formatCurrencyCompact(plan.freeNow) })
                  : t('budget.plan.willHitBody', {
                      amount: formatCurrencyCompact(appliedTrim),
                      count: applied.size,
                    })}
              </span>
            </>
          ) : (
            <>
              <span className="block text-sm leading-body-sm font-bold text-foreground">
                {t('budget.plan.shortTitle', { amount: formatCurrencyCompact(committedSavings) })}
              </span>
              <span className="block text-xs leading-caption text-muted-foreground">
                {t('budget.plan.shortBody', { amount: formatCurrencyCompact(shortfall) })}
              </span>
            </>
          )}
        </span>
      </div>

      {/* Sticky bottom CTA — the result screen is the conversion point */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <div className="pointer-events-auto mx-auto flex max-w-md flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              commitPlan()
              router.push('/start/budget/spend')
            }}
            className="text-sm leading-body-sm font-semibold text-primary hover:text-primary/80"
          >
            {t('budget.plan.adjustMyself')}
          </button>
          <ConversionCtaBlock onBeforeNavigate={commitPlan} />
        </div>
      </div>
    </div>
  )
}
