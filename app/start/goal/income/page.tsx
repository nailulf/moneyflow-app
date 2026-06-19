'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronLeft, Plus, Briefcase, Pencil, Lock, X, Check } from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

type Frequency = 'monthly' | 'weekly' | 'irregular'

const FREQUENCIES: Array<{ id: Frequency; labelKey: string }> = [
  { id: 'monthly', labelKey: 'goal.income.freqMonthly' },
  { id: 'weekly', labelKey: 'goal.income.freqWeekly' },
  { id: 'irregular', labelKey: 'goal.income.freqIrregular' },
]

/** Goal flow screen 2 (design Row B-2) — monthly income + named extra sources. */
export default function GoalIncomePage() {
  const t = useTranslations('start')
  const router = useRouter()

  const monthlyIncome = useFunnelStore((s) => s.monthlyIncome)
  const incomeSources = useFunnelStore((s) => s.incomeSources)
  const setMonthlyIncome = useFunnelStore((s) => s.setMonthlyIncome)
  const addIncomeSource = useFunnelStore((s) => s.addIncomeSource)
  const removeIncomeSource = useFunnelStore((s) => s.removeIncomeSource)

  // Frequency is kept visual for now; Monthly is the default.
  const [frequency, setFrequency] = useState<Frequency>('monthly')

  // Inline "add a source" mini-form state.
  const [adding, setAdding] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftAmount, setDraftAmount] = useState(0)

  const canContinue = !!monthlyIncome && monthlyIncome > 0
  const canAdd = draftName.trim().length > 0 && draftAmount > 0

  const handleAdd = () => {
    if (!canAdd) return
    addIncomeSource({ name: draftName.trim(), amount: draftAmount })
    setDraftName('')
    setDraftAmount(0)
    setAdding(false)
  }

  const handleContinue = () => {
    if (!canContinue) return
    router.push('/start/goal/spend')
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-6">
      <header className="pt-5 pb-3">
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
            onClick={() => router.push('/start/save')}
            className="shrink-0 text-sm leading-body-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('intent.skip')}
          </button>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl leading-title-3 font-bold text-foreground">
            {t('goal.income.title')}
          </h1>
          <p className="mt-1 text-sm leading-body-sm text-muted-foreground">
            {t('goal.income.subtitle')}
          </p>
        </div>
      </header>

      {/* Main monthly income — focused, bordered card */}
      <div className="rounded-2xl border-2 border-primary bg-card px-5 py-4 shadow-card">
        <label
          htmlFor="monthly-income"
          className="block text-xs leading-caption font-medium text-muted-foreground"
        >
          {t('goal.income.mainLabel')}
        </label>
        <CurrencyInput
          id="monthly-income"
          data-testid="monthly-income"
          value={monthlyIncome ?? 0}
          onChange={setMonthlyIncome}
          className="mt-1 h-auto border-0 bg-transparent px-0 pl-9 text-3xl leading-title-2 font-bold shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Frequency segmented */}
      <div className="mt-5">
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
                  'h-10 rounded-[12px] border text-sm leading-body-sm font-medium transition-colors',
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

      {/* Other income sources */}
      <div className="mt-5">
        <p className="text-sm leading-body-sm font-medium text-foreground">
          {t('goal.income.otherTitle')}
        </p>

        {incomeSources.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {incomeSources.map((src, i) => (
              <div
                key={`${src.name}-${i}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 shadow-card"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint-green-bg text-tint-green-fg">
                  <Briefcase className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-md leading-body-lg font-semibold text-foreground">
                    {src.name}
                  </span>
                  <span className="block text-xs leading-caption text-muted-foreground">
                    {t('goal.income.perMonth', { amount: formatCurrencyCompact(src.amount) })}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeIncomeSource(i)}
                  aria-label={t('goal.income.removeSource')}
                  className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {adding ? (
          <div className="mt-2 rounded-2xl border border-border bg-card p-4 shadow-card">
            <label
              htmlFor="source-name"
              className="block text-xs leading-caption font-medium text-muted-foreground"
            >
              {t('goal.income.sourceNameLabel')}
            </label>
            <Input
              id="source-name"
              data-testid="source-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={t('goal.income.sourceNamePlaceholder')}
              className="mt-1 h-11 rounded-[12px]"
            />
            <label
              htmlFor="source-amount"
              className="mt-3 block text-xs leading-caption font-medium text-muted-foreground"
            >
              {t('goal.income.sourceAmountLabel')}
            </label>
            <CurrencyInput
              id="source-amount"
              data-testid="source-amount"
              value={draftAmount}
              onChange={setDraftAmount}
              className="mt-1 h-11 rounded-[12px]"
            />
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                className="h-10 flex-1 gap-1.5 rounded-[12px] text-sm"
                onClick={() => {
                  setAdding(false)
                  setDraftName('')
                  setDraftAmount(0)
                }}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('goal.income.addCancel')}
              </Button>
              <Button
                className="h-10 flex-1 gap-1.5 rounded-[12px] text-sm"
                data-testid="confirm-source"
                disabled={!canAdd}
                onClick={handleAdd}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {t('goal.income.addConfirm')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            data-testid="add-source"
            onClick={() => setAdding(true)}
            className="mt-2 h-11 w-full gap-1.5 rounded-[12px] border-dashed text-sm font-medium text-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('goal.income.addSource')}
          </Button>
        )}

        {/* Privacy reassurance */}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs leading-caption text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('goal.income.privacyNote')}
        </p>
      </div>

      {/* Continue — disabled until main income set */}
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
