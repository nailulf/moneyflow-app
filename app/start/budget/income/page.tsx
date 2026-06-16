'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'

/** Budget flow step 1 (design tAKTn) — monthly take-home income. */
export default function BudgetIncomePage() {
  const t = useTranslations('start')
  const router = useRouter()

  const budgetIncome = useFunnelStore((s) => s.budgetIncome)
  const setBudgetIncome = useFunnelStore((s) => s.setBudgetIncome)

  // Lazily create the anonymous Supabase user on entering step 1 so the spend
  // step can read the user's seeded categories. Fire-and-forget; never blocks.
  useEffect(() => {
    ensureAnonymousSession().catch(() => {
      /* best-effort — the flow works regardless */
    })
  }, [])

  const canContinue = !!budgetIncome && budgetIncome > 0

  const handleContinue = () => {
    if (!canContinue) return
    router.push('/start/budget/savings')
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-10">
      <header className="py-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start/intent')}
            aria-label={t('intent.back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <FunnelProgress total={4} current={0} />
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
            {t('budget.income.title')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('budget.income.subtitle')}
          </p>
        </div>
      </header>

      <div>
        <label
          htmlFor="budget-income"
          className="block text-sm leading-body-sm font-medium text-foreground"
        >
          {t('budget.income.label')}
        </label>
        <CurrencyInput
          id="budget-income"
          data-testid="budget-income"
          value={budgetIncome ?? 0}
          onChange={setBudgetIncome}
          className="mt-2 h-[52px] rounded-[14px] text-lg"
        />
      </div>

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
