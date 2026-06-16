'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowRight,
  ChevronLeft,
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
import {
  financialHealthScore,
  type FinancialHealthResult,
  type HealthStatus,
} from '@/lib/onboarding/plan-math'
import { cn } from '@/lib/utils'

type Step = 'income' | 'savings' | 'debts' | 'result'

/** Order of the input steps; the gauge result is the 4th funnel dot. */
const STEP_INDEX: Record<Step, number> = { income: 0, savings: 1, debts: 2, result: 3 }

/** Score → band metadata. ≥70 Healthy, 40–69 Could be better, <40 Needs attention. */
function bandFor(score: number): { labelKey: string; pill: string; arc: string } {
  if (score >= 70) {
    return {
      labelKey: 'bandHealthy',
      pill: 'bg-tint-green-bg text-tint-green-fg',
      arc: 'hsl(var(--success))',
    }
  }
  if (score >= 40) {
    return {
      labelKey: 'bandCouldBeBetter',
      pill: 'bg-tint-amber-bg text-tint-amber-fg',
      arc: 'hsl(var(--tint-amber-fg))',
    }
  }
  return {
    labelKey: 'bandNeedsAttention',
    pill: 'bg-tint-orange-bg text-tint-orange-fg',
    arc: 'hsl(var(--destructive))',
  }
}

/** Status → badge label key + tint classes. */
const STATUS_META: Record<HealthStatus, { labelKey: string; pill: string }> = {
  good: { labelKey: 'statusGood', pill: 'bg-tint-green-bg text-tint-green-fg' },
  watch: { labelKey: 'statusWatch', pill: 'bg-tint-amber-bg text-tint-amber-fg' },
  low: { labelKey: 'statusLow', pill: 'bg-tint-orange-bg text-tint-orange-fg' },
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
  key: string
  icon: LucideIcon
  labelKey: string
  value: string
  status: HealthStatus
}

/** Circular-gauge score + categorized breakdown + conversion CTAs. */
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

  // Gauge geometry — a track circle + a progress arc via stroke-dashoffset.
  const SIZE = 160
  const STROKE = 12
  const radius = (SIZE - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.max(0, Math.min(100, result.score)) / 100)

  const rows = useMemo<BreakdownRow[]>(() => {
    const months = Number.isFinite(result.emergencyMonths)
      ? Math.round(result.emergencyMonths * 10) / 10
      : 99
    return [
      {
        key: 'netSavings',
        icon: PiggyBank,
        labelKey: 'rowNetSavings',
        value: t('valueSavingsRate', { rate: result.savingsRate }),
        status: result.breakdown.netSavings,
      },
      {
        key: 'emergencyFund',
        icon: ShieldCheck,
        labelKey: 'rowEmergencyFund',
        value: t('valueMonths', { months }),
        status: result.breakdown.emergencyFund,
      },
      {
        key: 'investing',
        icon: TrendingUp,
        labelKey: 'rowInvesting',
        value: t(result.breakdown.investing === 'good' ? 'valueInvesting' : 'valueNotInvesting'),
        status: result.breakdown.investing,
      },
      {
        key: 'debt',
        icon: Landmark,
        labelKey: 'rowDebt',
        value: t(
          result.breakdown.debt === 'good'
            ? 'valueDebtLow'
            : result.breakdown.debt === 'watch'
              ? 'valueDebtModerate'
              : 'valueDebtHigh'
        ),
        status: result.breakdown.debt,
      },
    ]
  }, [result, t])

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

      <div className="flex flex-col gap-4">
        {/* Circular gauge */}
        <div className="flex flex-col items-center">
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
                stroke="hsl(var(--muted))"
                strokeWidth={STROKE}
              />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={radius}
                fill="none"
                stroke={band.arc}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span data-testid="hc-score" className="text-4xl leading-title-1 font-bold text-foreground">
                {result.score}
              </span>
              <span className="text-xs leading-caption text-muted-foreground">
                {t('scoreOutOf')}
              </span>
            </div>
          </div>
          <span
            className={cn(
              'mt-4 inline-flex items-center rounded-full px-3 py-1 text-tiny font-semibold uppercase tracking-wide',
              band.pill
            )}
          >
            {t(band.labelKey)}
          </span>
        </div>

        {/* Breakdown card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <div key={row.key} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-tint-blue-bg text-tint-blue-fg">
                  <row.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-body-sm font-medium text-foreground">
                    {t(row.labelKey)}
                  </span>
                  <span className="block text-xs leading-caption text-muted-foreground">
                    {row.value}
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
        </div>
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
