'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronLeft, PiggyBank } from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { StickyCtaBar } from '@/components/features/budget/StickyCtaBar'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'

/** Budget flow step 1 (design tAKTn / BU1) — monthly take-home income. */
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
    <div className="flex flex-1 flex-col px-5">
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
          <FunnelProgress total={5} current={1} />
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
            {t('budget.income.title')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('budget.income.subtitle')}
          </p>
        </div>
      </header>

      {/* Focused, bordered income input card */}
      <div className="mt-2 rounded-2xl border-2 border-primary bg-card px-5 py-4 shadow-card">
        <label
          htmlFor="budget-income"
          className="block text-xs leading-caption font-medium text-muted-foreground"
        >
          {t('budget.income.label')}
        </label>
        <CurrencyInput
          id="budget-income"
          data-testid="budget-income"
          value={budgetIncome ?? 0}
          onChange={setBudgetIncome}
          className="mt-1 h-auto border-0 bg-transparent px-0 pl-9 text-3xl leading-title-2 font-bold shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Info note — what we'll do with the numbers */}
      <div className="mt-4 flex gap-3 rounded-2xl bg-tint-blue-bg px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-tint-blue-fg">
          <PiggyBank className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm leading-body-sm font-bold text-foreground">
            {t('budget.income.noteTitle')}
          </p>
          <p className="mt-1 text-sm leading-body-sm text-muted-foreground">
            {t('budget.income.noteBody')}
          </p>
        </div>
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
