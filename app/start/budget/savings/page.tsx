'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronLeft, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

/** Quick savings presets — % of monthly income. */
const PRESETS = [0.1, 0.2, 0.3] as const

/** Budget flow step 2 (design tAKTn) — monthly savings target. */
export default function BudgetSavingsPage() {
  const t = useTranslations('start')
  const router = useRouter()

  const budgetIncome = useFunnelStore((s) => s.budgetIncome) ?? 0
  const savingsAmount = useFunnelStore((s) => s.savingsAmount)
  const setSavingsAmount = useFunnelStore((s) => s.setSavingsAmount)

  const savings = savingsAmount ?? 0
  const overIncome = savings > budgetIncome
  const leftToSpend = Math.max(0, budgetIncome - savings)
  const canContinue = savings > 0 && !overIncome

  const handleContinue = () => {
    if (!canContinue) return
    router.push('/start/budget/spend')
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-10">
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
          <FunnelProgress total={4} current={1} />
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
            {t('budget.savings.title')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('budget.savings.subtitle')}
          </p>
        </div>
      </header>

      <div>
        <label
          htmlFor="budget-savings"
          className="block text-sm leading-body-sm font-medium text-foreground"
        >
          {t('budget.savings.label')}
        </label>
        <CurrencyInput
          id="budget-savings"
          data-testid="budget-savings"
          value={savings}
          onChange={setSavingsAmount}
          className="mt-2 h-[52px] rounded-[14px] text-lg"
        />
      </div>

      {/* Percent preset chips — tap to set savings to a share of income. */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {PRESETS.map((pct) => {
          const amount = Math.round(budgetIncome * pct)
          const active = budgetIncome > 0 && savings === amount && savings > 0
          return (
            <button
              key={pct}
              type="button"
              aria-pressed={active}
              disabled={budgetIncome <= 0}
              onClick={() => setSavingsAmount(amount)}
              className={cn(
                'h-11 rounded-[12px] border text-sm leading-body-sm font-medium transition-colors disabled:opacity-50',
                active
                  ? 'border-primary bg-selected text-selected-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
              )}
            >
              {t('budget.savings.preset', { pct: Math.round(pct * 100) })}
            </button>
          )
        })}
      </div>

      {/* Live readout — what's left to spend after savings. */}
      {overIncome ? (
        <div className="mt-4 flex items-center gap-2 rounded-[12px] bg-tint-amber-bg px-4 py-3 text-tint-amber-fg">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-sm leading-body-sm font-medium">
            {t('budget.savings.overWarning')}
          </span>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-body-sm text-muted-foreground">
          {t('budget.savings.leftToSpend', { amount: formatCurrency(leftToSpend) })}
        </p>
      )}

      <Button
        className="mt-auto h-[52px] w-full gap-2 rounded-[14px] text-md"
        disabled={!canContinue}
        onClick={handleContinue}
      >
        {t('budget.continue')}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
