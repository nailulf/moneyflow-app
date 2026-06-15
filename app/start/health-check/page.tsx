'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowRight,
  ChevronLeft,
  HeartPulse,
  PiggyBank,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous'
import { advanceOnboarding } from '@/lib/api/onboarding-funnel'
import { healthScore } from '@/lib/onboarding/plan-math'
import { cn } from '@/lib/utils'

type Step = 'quiz' | 'result'
/** Tri-state yes/no chip answer. `null` = unanswered (optional). */
type YesNo = boolean | null

/** Score → band metadata. Thresholds: ≥70 Healthy, 40–69 Getting there, <40 Needs attention. */
function bandFor(score: number): {
  labelKey: string
  pill: string
} {
  if (score >= 70) {
    return { labelKey: 'bandHealthy', pill: 'bg-success/10 text-success' }
  }
  if (score >= 40) {
    return { labelKey: 'bandGettingThere', pill: 'bg-tint-amber-bg text-tint-amber-fg' }
  }
  return { labelKey: 'bandNeedsAttention', pill: 'bg-destructive/10 text-destructive' }
}

/** Standalone "financial health check" — quiz → score result. No account needed. */
export default function HealthCheckPage() {
  const t = useTranslations('start.health')
  const router = useRouter()

  const [step, setStep] = useState<Step>('quiz')
  const [income, setIncome] = useState(0)
  const [spend, setSpend] = useState(0)
  const [hasEmergencyFund, setHasEmergencyFund] = useState<YesNo>(null)
  const [hasDebt, setHasDebt] = useState<YesNo>(null)
  const [score, setScore] = useState(0)

  const canSeeScore = income > 0 && spend > 0

  const handleSeeScore = async () => {
    if (!canSeeScore) return
    const computed = healthScore({ income, spend })
    setScore(computed)
    setStep('result')

    // Best-effort persistence — never block the result on it (truly "no account needed").
    try {
      await ensureAnonymousSession()
      await advanceOnboarding('health_check', {
        event_type: 'step_completed',
        metadata: { score: computed, income, spend },
      })
    } catch {
      /* swallow — the score shows regardless of persistence */
    }
  }

  const savingsRate = income > 0 ? Math.round(((income - spend) / income) * 100) : 0

  // 1–2 contextual tips driven by the score and the optional answers.
  const tips = useMemo(() => {
    const rows: Array<{ key: string; icon: LucideIcon; labelKey: string }> = []
    if (hasDebt === true) {
      rows.push({ key: 'debt', icon: TrendingDown, labelKey: 'tipClearDebt' })
    }
    if (savingsRate < 20) {
      rows.push({ key: 'save', icon: PiggyBank, labelKey: 'tipSaveMore' })
    } else if (hasEmergencyFund === false) {
      rows.push({ key: 'fund', icon: ShieldCheck, labelKey: 'tipBuildFund' })
    } else {
      rows.push({ key: 'keep', icon: Sparkles, labelKey: 'tipKeepGoing' })
    }
    return rows.slice(0, 2)
  }, [hasDebt, hasEmergencyFund, savingsRate])

  if (step === 'result') {
    const band = bandFor(score)
    return (
      <div className="flex flex-1 flex-col px-5 pb-32">
        <header className="py-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('quiz')}
              aria-label={t('back')}
              className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="shrink-0 text-sm leading-body-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('skip')}
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {/* Hero score card */}
          <div className="flex flex-col items-center rounded-[20px] bg-hero-gradient px-5 py-8 text-center text-hero-foreground shadow-floating">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-hero-foreground/10">
              <HeartPulse className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 flex items-baseline gap-1.5">
              <span data-testid="hc-score" className="text-4xl leading-title-1 font-bold">
                {score}
              </span>
              <span className="text-md leading-body-lg font-medium text-hero-muted">
                {t('scoreOutOf')}
              </span>
            </p>
            <span
              className={cn(
                'mt-4 inline-flex items-center rounded-full px-3 py-1 text-tiny font-semibold uppercase tracking-wide',
                band.pill
              )}
            >
              {t(band.labelKey)}
            </span>
          </div>

          {/* Savings-rate breakdown */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm leading-body-sm text-foreground">
              {savingsRate >= 0
                ? t('savingsRate', { rate: savingsRate })
                : t('overspending')}
            </p>
          </div>

          {/* Contextual tips */}
          {tips.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-col gap-3">
                {tips.map((tip) => (
                  <div key={tip.key} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-blue-bg text-tint-blue-fg">
                      <tip.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-body-sm text-foreground">
                      {t(tip.labelKey)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky bottom CTA */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
          <div className="pointer-events-auto mx-auto flex max-w-md flex-col items-center gap-3">
            <Button
              className="h-[52px] w-full gap-2 rounded-[14px] text-md"
              onClick={() => router.push('/start/save')}
            >
              {t('saveCta')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm leading-body-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('guestCta')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Quiz step ──────────────────────────────────────────────────────────
  const yesNoChips = (
    value: YesNo,
    onSelect: (v: boolean) => void
  ) => (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {([true, false] as const).map((v) => {
        const active = value === v
        return (
          <button
            key={String(v)}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(v)}
            className={cn(
              'h-11 rounded-[12px] border text-sm leading-body-sm font-medium transition-colors',
              active
                ? 'border-primary bg-selected text-selected-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
            )}
          >
            {v ? t('yes') : t('no')}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-1 flex-col px-5 pb-32">
      <header className="py-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start/intent')}
            aria-label={t('back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="shrink-0 text-sm leading-body-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('skip')}
          </button>
        </div>

        <div className="mt-6">
          <h1 className="text-2xl leading-title-3 font-bold text-foreground">
            {t('quizTitle')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('quizSubtitle')}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {/* Monthly income */}
        <div>
          <label
            htmlFor="hc-income"
            className="block text-sm leading-body-sm font-medium text-foreground"
          >
            {t('incomeLabel')}
          </label>
          <CurrencyInput
            id="hc-income"
            data-testid="hc-income"
            value={income}
            onChange={setIncome}
            className="mt-2 h-[52px] rounded-[14px] text-lg"
          />
        </div>

        {/* Monthly spending */}
        <div>
          <label
            htmlFor="hc-spend"
            className="block text-sm leading-body-sm font-medium text-foreground"
          >
            {t('spendLabel')}
          </label>
          <CurrencyInput
            id="hc-spend"
            data-testid="hc-spend"
            value={spend}
            onChange={setSpend}
            className="mt-2 h-[52px] rounded-[14px] text-lg"
          />
        </div>

        {/* Emergency fund chip */}
        <div>
          <p className="text-sm leading-body-sm font-medium text-foreground">
            {t('emergencyQuestion')}
          </p>
          {yesNoChips(hasEmergencyFund, setHasEmergencyFund)}
        </div>

        {/* Debt chip */}
        <div>
          <p className="text-sm leading-body-sm font-medium text-foreground">
            {t('debtQuestion')}
          </p>
          {yesNoChips(hasDebt, setHasDebt)}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <div className="pointer-events-auto mx-auto max-w-md">
          <Button
            className="h-[52px] w-full gap-2 rounded-[14px] text-md"
            disabled={!canSeeScore}
            onClick={handleSeeScore}
          >
            {t('seeScore')}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
