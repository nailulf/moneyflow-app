'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronLeft, Sparkles, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { StickyCtaBar } from '@/components/features/budget/StickyCtaBar'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

/** Quick savings presets — share of monthly income. */
const PRESETS = [0.1, 0.2, 0.3] as const

/** Budget flow step 2 (design tAKTn / BU2) — monthly savings target. */
export default function BudgetSavingsPage() {
  const t = useTranslations('start')
  const router = useRouter()

  const budgetIncome = useFunnelStore((s) => s.budgetIncome) ?? 0
  const savingsAmount = useFunnelStore((s) => s.savingsAmount)
  const setSavingsAmount = useFunnelStore((s) => s.setSavingsAmount)

  const savings = savingsAmount ?? 0
  const pct = budgetIncome > 0 ? Math.round((savings / budgetIncome) * 100) : 0
  const canContinue = savings > 0

  // True when the current amount matches NONE of the % presets — the "Custom"
  // chip lights up in that case (design BU2: Custom is filled when typing freely).
  const matchesPreset =
    budgetIncome > 0 &&
    savings > 0 &&
    PRESETS.some((p) => Math.round(budgetIncome * p) === savings)

  const focusInput = () => {
    document.getElementById('budget-savings')?.focus()
  }

  const handleContinue = () => {
    if (!canContinue) return
    router.push('/start/budget/spend')
  }

  return (
    <div className="flex flex-1 flex-col px-5">
      <header className="py-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start/budget/income')}
            aria-label={t('intent.back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <FunnelProgress total={5} current={2} />
          <button
            type="button"
            onClick={() => router.push('/start/save')}
            className="shrink-0 text-sm leading-body-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('intent.skip')}
          </button>
        </div>

        <div className="mt-6">
          <h1 className="text-2xl leading-title-3 font-bold text-foreground">
            {t('budget.savings.title')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('budget.savings.subtitle')}
          </p>
        </div>
      </header>

      {/* Bordered savings card with live %-of-income readout */}
      <div className="mt-2 rounded-2xl border-2 border-primary bg-card px-5 py-4 shadow-card">
        <label
          htmlFor="budget-savings"
          className="block text-xs leading-caption font-medium text-muted-foreground"
        >
          {t('budget.savings.label')}
        </label>
        <CurrencyInput
          id="budget-savings"
          data-testid="budget-savings"
          value={savings}
          onChange={setSavingsAmount}
          className="mt-1 h-auto border-0 bg-transparent px-0 pl-9 text-3xl leading-title-2 font-bold shadow-none focus-visible:ring-0"
        />
        {budgetIncome > 0 && savings > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-sm leading-body-sm font-medium text-success">
            <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('budget.savings.ofIncome', {
              pct,
              income: formatCurrencyCompact(budgetIncome),
            })}
          </p>
        )}
      </div>

      {/* Quick picks — three % presets + a Custom chip */}
      <p className="mt-5 text-sm leading-body-sm font-bold text-foreground">
        {t('budget.savings.quickPicks')}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {PRESETS.map((p) => {
          const amount = Math.round(budgetIncome * p)
          const active = budgetIncome > 0 && savings === amount && savings > 0
          return (
            <button
              key={p}
              type="button"
              aria-pressed={active}
              disabled={budgetIncome <= 0}
              onClick={() => setSavingsAmount(amount)}
              className={cn(
                'flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-[12px] border transition-colors disabled:opacity-50',
                active
                  ? 'border-primary bg-selected'
                  : 'border-border bg-card hover:bg-muted/50'
              )}
            >
              <span className="text-sm leading-body-sm font-semibold text-foreground">
                {formatCurrencyCompact(amount)}
              </span>
              <span className="text-tiny font-medium text-muted-foreground">
                {t('budget.savings.preset', { pct: Math.round(p * 100) })}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          aria-pressed={!matchesPreset && savings > 0}
          onClick={focusInput}
          className={cn(
            'flex h-[52px] items-center justify-center rounded-[12px] border text-sm leading-body-sm font-semibold transition-colors',
            !matchesPreset && savings > 0
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-foreground hover:bg-muted/50'
          )}
        >
          {t('budget.savings.custom')}
        </button>
      </div>

      {/* Green encouragement note */}
      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-tint-green-bg px-4 py-3.5">
        <Sparkles className="h-5 w-5 shrink-0 text-tint-green-fg" aria-hidden="true" />
        <p className="text-sm leading-body-sm text-foreground">
          {t('budget.savings.note')}
        </p>
      </div>

      <StickyCtaBar>
        <Button
          className="h-[52px] w-full gap-2 rounded-[14px] text-md"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          {t('budget.continue')}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </StickyCtaBar>
    </div>
  )
}
