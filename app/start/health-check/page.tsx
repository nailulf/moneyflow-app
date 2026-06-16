'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowRight,
  ChevronLeft,
  Lightbulb,
  Scale,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  Landmark,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous'
import { advanceOnboarding } from '@/lib/api/onboarding-funnel'
import { formatCurrencyCompact } from '@/lib/data-utils'
import {
  financialHealthScore,
  type FinancialHealthResult,
  type HealthFactor,
  type HealthStatus,
} from '@/lib/onboarding/plan-math'
import { cn } from '@/lib/utils'

type Step = 'income' | 'savings' | 'debts' | 'result'

/** Order of the input steps; the gauge result is the 4th funnel dot. */
const STEP_INDEX: Record<Step, number> = { income: 0, savings: 1, debts: 2, result: 3 }

/**
 * Score → improvement-pill band shown on the navy hero.
 * ≥80 On track, 55–79 Can improve, <55 Needs work.
 * Pill styling reads on the dark hero, so it uses translucent fills + light text.
 */
function bandFor(score: number): { labelKey: string; pill: string } {
  if (score >= 80) {
    return { labelKey: 'bandOnTrack', pill: 'bg-hero-success/20 text-hero-success' }
  }
  if (score >= 55) {
    return { labelKey: 'bandCanImprove', pill: 'bg-tint-amber-fg/20 text-tint-amber-fg' }
  }
  return { labelKey: 'bandNeedsWork', pill: 'bg-hero-danger/20 text-hero-danger' }
}

/** Status → breakdown badge label key + tint classes. */
const STATUS_META: Record<HealthStatus, { labelKey: string; pill: string }> = {
  good: { labelKey: 'statusGood', pill: 'bg-tint-green-bg text-tint-green-fg' },
  watch: { labelKey: 'statusWatch', pill: 'bg-tint-amber-bg text-tint-amber-fg' },
  low: { labelKey: 'statusLow', pill: 'bg-tint-orange-bg text-tint-orange-fg' },
}

/** Per-factor icon + tint for the breakdown rows (matches the d1RzG design). */
const FACTOR_META: Record<HealthFactor, { icon: LucideIcon; tint: string }> = {
  savingsRatio: { icon: PiggyBank, tint: 'bg-tint-blue-bg text-tint-blue-fg' },
  debtToIncome: { icon: Scale, tint: 'bg-tint-teal-bg text-tint-teal-fg' },
  emergencyFund: { icon: ShieldCheck, tint: 'bg-tint-orange-bg text-tint-orange-fg' },
  netWorth: { icon: Landmark, tint: 'bg-tint-purple-bg text-tint-purple-fg' },
}

/** Order the breakdown rows render in (matches the design). */
const FACTOR_ORDER: HealthFactor[] = ['savingsRatio', 'debtToIncome', 'emergencyFund', 'netWorth']

/**
 * Pick the single weakest factor to drive the hero summary + the "Top priority" tip.
 * Lowest status first ('low' < 'watch' < 'good'); ties break by FACTOR_ORDER.
 */
function weakestFactor(breakdown: Record<HealthFactor, HealthStatus>): HealthFactor {
  const rank: Record<HealthStatus, number> = { low: 0, watch: 1, good: 2 }
  return FACTOR_ORDER.reduce((worst, factor) =>
    rank[breakdown[factor]] < rank[breakdown[worst]] ? factor : worst
  )
}

/** Standalone "financial health check" — 4-step flow ending in a score gauge. No account needed. */
export default function HealthCheckPage() {
  const t = useTranslations('start.health')
  const router = useRouter()

  const [step, setStep] = useState<Step>('income')

  // Self-contained local inputs — the result is computed in-page and only the
  // final score is persisted via the onboarding event log (no draft to keep).
  const [income, setIncome] = useState(0)
  const [spending, setSpending] = useState(0)
  const [savings, setSavings] = useState(0)
  const [investments, setInvestments] = useState(0)
  const [debt, setDebt] = useState(0)
  const [debtPayment, setDebtPayment] = useState(0)

  const [result, setResult] = useState<FinancialHealthResult | null>(null)

  // Lazily create the anonymous Supabase user on entering step 1.
  // Idempotent / single-flight; fire-and-forget so it never blocks the flow.
  useEffect(() => {
    ensureAnonymousSession().catch(() => {
      /* best-effort — the health check works regardless */
    })
  }, [])

  const handleSeeHealth = async () => {
    const computed = financialHealthScore({
      income,
      spending,
      savings,
      investments,
      debt,
      debtPayment,
    })
    setResult(computed)
    setStep('result')

    // Best-effort persistence — never block the result on it.
    try {
      await advanceOnboarding('health_check', {
        event_type: 'step_completed',
        metadata: { score: computed.score },
      })
    } catch {
      /* swallow — the score shows regardless of persistence */
    }
  }

  // ─── Result step ─────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    return <ResultStep result={result} onBack={() => setStep('debts')} router={router} t={t} />
  }

  // ─── Input steps share the same chrome ─────────────────────────────────────
  const onBack = () => {
    if (step === 'income') router.push('/start/intent')
    else if (step === 'savings') setStep('income')
    else setStep('savings')
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-32">
      <header className="py-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <FunnelProgress total={4} current={STEP_INDEX[step]} />
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
            {t(`${step}Title`)}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t(`${step}Subtitle`)}
          </p>
        </div>
      </header>

      {step === 'income' && (
        <div className="flex flex-col gap-6">
          <Field
            id="hc-income"
            label={t('incomeLabel')}
            value={income}
            onChange={setIncome}
          />
          <Field
            id="hc-spending"
            label={t('spendingLabel')}
            value={spending}
            onChange={setSpending}
          />
        </div>
      )}

      {step === 'savings' && (
        <div className="flex flex-col gap-6">
          <Field
            id="hc-savings"
            label={t('savingsLabel')}
            value={savings}
            onChange={setSavings}
          />
          <Field
            id="hc-investments"
            label={t('investmentsLabel')}
            value={investments}
            onChange={setInvestments}
          />
        </div>
      )}

      {step === 'debts' && (
        <div className="flex flex-col gap-6">
          <Field id="hc-debt" label={t('debtLabel')} value={debt} onChange={setDebt} />
          <Field
            id="hc-debt-payment"
            label={t('debtPaymentLabel')}
            value={debtPayment}
            onChange={setDebtPayment}
          />
        </div>
      )}

      {/* Sticky bottom CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <div className="pointer-events-auto mx-auto max-w-md">
          {step === 'income' && (
            <Button
              className="h-[52px] w-full gap-2 rounded-[14px] text-md"
              disabled={income <= 0}
              onClick={() => setStep('savings')}
            >
              {t('continue')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
          {step === 'savings' && (
            <Button
              className="h-[52px] w-full gap-2 rounded-[14px] text-md"
              onClick={() => setStep('debts')}
            >
              {t('continue')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
          {step === 'debts' && (
            <Button
              className="h-[52px] w-full gap-2 rounded-[14px] text-md"
              onClick={handleSeeHealth}
            >
              {t('seeHealth')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Labelled CurrencyInput row — the repeated control across all three input steps. */
function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm leading-body-sm font-medium text-foreground"
      >
        {label}
      </label>
      <CurrencyInput
        id={id}
        data-testid={id}
        value={value}
        onChange={onChange}
        className="mt-2 h-[52px] rounded-[14px] text-lg"
      />
    </div>
  )
}

interface BreakdownRow {
  factor: HealthFactor
  icon: LucideIcon
  tint: string
  labelKey: string
  detail: string
  status: HealthStatus
}

/**
 * Navy hero banner (gauge + improvement pill + summary) over a white breakdown card,
 * a "Top priority" tip, then the conversion CTAs — the d1RzG result screen.
 */
function ResultStep({
  result,
  onBack,
  router,
  t,
}: {
  result: FinancialHealthResult
  onBack: () => void
  router: ReturnType<typeof useRouter>
  t: ReturnType<typeof useTranslations>
}) {
  const band = bandFor(result.score)
  const weakest = weakestFactor(result.breakdown)

  // Gauge geometry — a track circle + a progress arc via stroke-dashoffset, on navy.
  const SIZE = 140
  const STROKE = 12
  const radius = (SIZE - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.max(0, Math.min(100, result.score)) / 100)

  const rows = useMemo<BreakdownRow[]>(() => {
    const months = Number.isFinite(result.emergencyMonths)
      ? Math.round(result.emergencyMonths * 10) / 10
      : 99
    const detailFor: Record<HealthFactor, string> = {
      savingsRatio: t('detailSavings', { rate: Math.max(0, result.savingsRate) }),
      debtToIncome: t('detailDebt', { pct: result.debtToIncomePct }),
      emergencyFund: t('detailEmergency', { months }),
      netWorth: t('detailNetWorth', {
        amount: formatCurrencyCompact(result.netWorth),
        sign: t(result.netWorth >= 0 ? 'signPositive' : 'signNegative'),
      }),
    }
    return FACTOR_ORDER.map((factor) => ({
      factor,
      icon: FACTOR_META[factor].icon,
      tint: FACTOR_META[factor].tint,
      labelKey: `row_${factor}`,
      detail: detailFor[factor],
      status: result.breakdown[factor],
    }))
  }, [result, t])

  return (
    <div className="flex flex-1 flex-col px-5 pb-32">
      <header className="py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('back')}
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
            {t('skip')}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {/* Navy hero banner — improvement pill + gauge + summary */}
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-hero-gradient px-5 py-4 text-hero-foreground shadow-card">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-tiny font-bold',
              band.pill
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            {t(band.labelKey)}
          </span>

          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="-rotate-90"
              aria-hidden="true"
            >
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--hero-foreground) / 0.15)"
                strokeWidth={STROKE}
              />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--hero-success))"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                data-testid="hc-score"
                className="text-4xl leading-title-1 font-bold text-hero-foreground"
              >
                {result.score}
              </span>
              <span className="text-xs leading-caption text-hero-muted">{t('scoreOutOf')}</span>
            </div>
          </div>

          <p className="text-center text-sm leading-body-sm text-hero-muted">
            {t(`summary_${weakest}`)}
          </p>
        </div>

        {/* Breakdown card */}
        <div className="rounded-2xl bg-card px-4 shadow-card">
          {rows.map((row, i) => (
            <div
              key={row.factor}
              className={cn(
                'flex items-center gap-3 py-3',
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
                  {t(row.labelKey)}
                </span>
                <span className="block text-xs leading-caption text-muted-foreground">
                  {row.detail}
                </span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-tiny font-semibold',
                  STATUS_META[row.status].pill
                )}
              >
                {t(STATUS_META[row.status].labelKey)}
              </span>
            </div>
          ))}
        </div>

        {/* Top priority tip */}
        <div className="flex gap-2.5 rounded-2xl bg-muted/50 p-3.5">
          <Lightbulb className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-sm leading-body-sm font-bold text-foreground">
              {t('tipTitle')}
            </span>
            <span className="block text-xs leading-caption text-muted-foreground">
              {t(`tip_${weakest}`)}
            </span>
          </span>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <div className="pointer-events-auto mx-auto flex max-w-md flex-col items-center gap-2">
          <Button
            className="h-[52px] w-full gap-2 rounded-[14px] text-md"
            onClick={() => router.push('/start/save')}
          >
            {t('saveCta')}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
          <button
            type="button"
            // TODO: point to /start/budget when Flow 2 is built
            onClick={() => router.push('/start/intent')}
            className="py-1 text-sm leading-body-sm font-semibold text-primary hover:text-primary/80"
          >
            {t('buildBudgetCta')}
          </button>
        </div>
      </div>
    </div>
  )
}
