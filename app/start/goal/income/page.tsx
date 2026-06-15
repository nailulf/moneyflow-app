'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronLeft, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { cn } from '@/lib/utils'

type Frequency = 'monthly' | 'weekly' | 'irregular'

const FREQUENCIES: Array<{ id: Frequency; labelKey: string }> = [
  { id: 'monthly', labelKey: 'goal.income.freqMonthly' },
  { id: 'weekly', labelKey: 'goal.income.freqWeekly' },
  { id: 'irregular', labelKey: 'goal.income.freqIrregular' },
]

/** Goal flow screen 2 (design Row B-2) — monthly income. */
export default function GoalIncomePage() {
  const t = useTranslations('start')
  const router = useRouter()

  const monthlyIncome = useFunnelStore((s) => s.monthlyIncome)
  const otherIncome = useFunnelStore((s) => s.otherIncome)
  const setMonthlyIncome = useFunnelStore((s) => s.setMonthlyIncome)
  const setOtherIncome = useFunnelStore((s) => s.setOtherIncome)

  // Frequency is kept visual for now; Monthly is the default.
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [showOther, setShowOther] = useState(otherIncome != null)

  const canContinue = !!monthlyIncome && monthlyIncome > 0

  const handleContinue = () => {
    if (!canContinue) return
    router.push('/start/goal/spend')
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-10">
      <header className="py-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start/goal/type')}
            aria-label={t('intent.back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <FunnelProgress total={4} current={2} />
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
            {t('goal.income.title')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('goal.income.subtitle')}
          </p>
        </div>
      </header>

      {/* Main monthly income */}
      <div>
        <label
          htmlFor="monthly-income"
          className="block text-sm leading-body-sm font-medium text-foreground"
        >
          {t('goal.income.mainLabel')}
        </label>
        <CurrencyInput
          id="monthly-income"
          data-testid="monthly-income"
          value={monthlyIncome ?? 0}
          onChange={setMonthlyIncome}
          className="mt-2 h-[52px] rounded-[14px] text-lg"
        />
      </div>

      {/* Frequency segmented */}
      <div className="mt-6">
        <p className="text-sm leading-body-sm font-medium text-foreground">
          {t('goal.income.freqLabel')}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {FREQUENCIES.map((f) => {
            const active = frequency === f.id
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFrequency(f.id)}
                className={cn(
                  'h-11 rounded-[12px] border text-sm leading-body-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-selected text-selected-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                )}
              >
                {t(f.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Other income sources — one optional extra */}
      <div className="mt-6">
        {!showOther ? (
          <button
            type="button"
            onClick={() => setShowOther(true)}
            className="inline-flex items-center gap-1.5 text-sm leading-body-sm font-medium text-primary hover:text-primary/80"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('goal.income.addSource')}
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="other-income"
                className="block text-sm leading-body-sm font-medium text-foreground"
              >
                {t('goal.income.otherLabel')}
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowOther(false)
                  setOtherIncome(undefined)
                }}
                aria-label={t('goal.income.removeSource')}
                className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <CurrencyInput
              id="other-income"
              data-testid="other-income"
              value={otherIncome ?? 0}
              onChange={setOtherIncome}
              className="mt-2 h-[52px] rounded-[14px] text-lg"
            />
          </div>
        )}
      </div>

      {/* Continue — disabled until income set */}
      <Button
        className="mt-auto h-[52px] w-full gap-2 rounded-[14px] text-md"
        disabled={!canContinue}
        onClick={handleContinue}
      >
        {t('goal.continue')}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
