'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ShieldCheck,
  Plane,
  Smartphone,
  CreditCard,
  Pencil,
  ArrowRight,
  ChevronLeft,
  Check,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { useFunnelStore, type FunnelGoalType } from '@/lib/onboarding/funnel-store'
import { cn } from '@/lib/utils'

interface GoalOption {
  id: FunnelGoalType
  testId: string
  icon: LucideIcon
  titleKey: string
  subKey: string
  tint: string
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'emergency_fund',
    testId: 'goal-emergency_fund',
    icon: ShieldCheck,
    titleKey: 'goal.type.emergencyTitle',
    subKey: 'goal.type.emergencySub',
    tint: 'bg-tint-green-bg text-tint-green-fg',
  },
  {
    id: 'vacation',
    testId: 'goal-vacation',
    icon: Plane,
    titleKey: 'goal.type.vacationTitle',
    subKey: 'goal.type.vacationSub',
    tint: 'bg-tint-blue-bg text-tint-blue-fg',
  },
  {
    id: 'gadget',
    testId: 'goal-gadget',
    icon: Smartphone,
    titleKey: 'goal.type.gadgetTitle',
    subKey: 'goal.type.gadgetSub',
    tint: 'bg-tint-amber-bg text-tint-amber-fg',
  },
  {
    id: 'debt_payoff',
    testId: 'goal-debt_payoff',
    icon: CreditCard,
    titleKey: 'goal.type.debtTitle',
    subKey: 'goal.type.debtSub',
    tint: 'bg-tint-pink-bg text-tint-pink-fg',
  },
  {
    id: 'custom',
    testId: 'goal-custom',
    icon: Pencil,
    titleKey: 'goal.type.customTitle',
    subKey: 'goal.type.customSub',
    tint: 'bg-tint-slate-bg text-tint-slate-fg',
  },
]

/** Horizon pills. `null` value = "Custom" (keeps the default 12 for now). */
const HORIZONS: Array<{ labelKey: string; months: number | null }> = [
  { labelKey: 'goal.type.horizon3', months: 3 },
  { labelKey: 'goal.type.horizon6', months: 6 },
  { labelKey: 'goal.type.horizon12', months: 12 },
  { labelKey: 'goal.type.horizonCustom', months: null },
]

/** Goal flow screen 1 (design Row B-1) — pick a short-term goal + target. */
export default function GoalTypePage() {
  const t = useTranslations('start')
  const router = useRouter()

  const goalType = useFunnelStore((s) => s.goalType)
  const targetAmount = useFunnelStore((s) => s.targetAmount)
  const horizonMonths = useFunnelStore((s) => s.horizonMonths)
  const setGoalType = useFunnelStore((s) => s.setGoalType)
  const setTargetAmount = useFunnelStore((s) => s.setTargetAmount)
  const setHorizonMonths = useFunnelStore((s) => s.setHorizonMonths)

  const [horizonIsCustom, setHorizonIsCustom] = useState(false)

  // Design default: "Vacation / Trip" pre-selected (blue border + filled radio).
  // Run once on mount; we intentionally don't re-apply if the user clears it.
  useEffect(() => {
    if (!useFunnelStore.getState().goalType) setGoalType('vacation')
  }, [setGoalType])

  const canContinue = !!goalType && !!targetAmount && targetAmount > 0

  const handleContinue = () => {
    if (!goalType || !targetAmount) return
    router.push('/start/goal/income')
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-4">
      <header className="pt-4 pb-3">
        {/* Top row: back · progress dots · Skip */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start/intent')}
            aria-label={t('intent.back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <FunnelProgress total={4} current={1} />
          <button
            type="button"
            onClick={() => router.push('/')}
            className="shrink-0 text-sm leading-body-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('intent.skip')}
          </button>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl leading-title-3 font-bold text-foreground">
            {t('goal.type.title')}
          </h1>
          <p className="mt-1 text-sm leading-body-sm text-muted-foreground">
            {t('goal.type.subtitle')}
          </p>
        </div>
      </header>

      {/* Goal option cards (single-select) — compact / dense */}
      <div className="flex flex-col gap-2.5">
        {GOAL_OPTIONS.map((opt) => {
          const active = goalType === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              data-testid={opt.testId}
              aria-pressed={active}
              onClick={() => setGoalType(opt.id)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border bg-card px-3.5 py-3 text-left shadow-card transition-colors',
                active ? 'border-primary bg-selected' : 'border-border hover:bg-muted/50'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]',
                  opt.tint
                )}
              >
                <opt.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-md leading-body-lg font-semibold text-foreground">
                  {t(opt.titleKey)}
                </span>
                <span className="block text-xs leading-caption text-muted-foreground">
                  {t(opt.subKey)}
                </span>
              </span>
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  active ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-transparent'
                )}
                aria-hidden="true"
              >
                {active && (
                  <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Target amount */}
      <div className="mt-4">
        <label
          htmlFor="target-amount"
          className="block text-sm leading-body-sm font-medium text-foreground"
        >
          {t('goal.type.targetLabel')}
        </label>
        <CurrencyInput
          id="target-amount"
          data-testid="target-amount"
          value={targetAmount ?? 0}
          onChange={setTargetAmount}
          className="mt-1.5 h-[52px] rounded-[14px] bg-card text-lg"
        />
      </div>

      {/* Horizon segmented pills */}
      <div className="mt-4">
        <p className="text-sm leading-body-sm font-medium text-foreground">
          {t('goal.type.horizonLabel')}
        </p>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {HORIZONS.map((h) => {
            const active =
              h.months === null ? horizonIsCustom : !horizonIsCustom && horizonMonths === h.months
            return (
              <button
                key={h.labelKey}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (h.months === null) {
                    setHorizonIsCustom(true)
                  } else {
                    setHorizonIsCustom(false)
                    setHorizonMonths(h.months)
                  }
                }}
                className={cn(
                  'h-10 rounded-[12px] border text-sm leading-body-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-selected text-selected-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                )}
              >
                {t(h.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Continue — disabled until goal type + target set */}
      <Button
        className="mt-5 h-[52px] w-full gap-2 rounded-[14px] text-md"
        disabled={!canContinue}
        onClick={handleContinue}
      >
        {t('goal.continue')}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
