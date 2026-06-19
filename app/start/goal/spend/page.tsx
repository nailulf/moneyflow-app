'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronLeft, Check, Plus } from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { estimateSpend } from '@/lib/onboarding/spend-estimate'
import { ONBOARDING_SPEND_CATEGORIES } from '@/lib/onboarding/spend-categories'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { cn } from '@/lib/utils'

/** Goal flow screen 3 (design Row B-3) — estimate monthly spend by category. */
export default function GoalSpendPage() {
  const t = useTranslations('start')
  const router = useRouter()

  const monthlyIncome = useFunnelStore((s) => s.monthlyIncome)
  const incomeSources = useFunnelStore((s) => s.incomeSources)
  const spend = useFunnelStore((s) => s.spend)
  const setSpend = useFunnelStore((s) => s.setSpend)
  const customCategories = useFunnelStore((s) => s.customCategories)
  const addCustomCategory = useFunnelStore((s) => s.addCustomCategory)

  // "Add another category" inline input state
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const newCategoryInputRef = useRef<HTMLInputElement>(null)

  const rows = useMemo(
    () => [
      ...ONBOARDING_SPEND_CATEGORIES.map((c) => ({ slug: c.slug, name: c.name })),
      ...customCategories,
    ],
    [customCategories]
  )

  const totalIncome = (monthlyIncome ?? 0) + incomeSources.reduce((sum, s) => sum + s.amount, 0)

  // Pre-fill sensible, income-proportional estimates for the static categories
  // once (only when income is set). Never overwrites values the user has set.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || totalIncome <= 0) return
    prefilled.current = true
    const current = useFunnelStore.getState().spend
    for (const cat of ONBOARDING_SPEND_CATEGORIES) {
      if (!current[cat.slug]) setSpend(cat.slug, estimateSpend(cat.name, totalIncome))
    }
  }, [totalIncome, setSpend])

  // Focus the input when the add-another row opens
  useEffect(() => {
    if (addingCategory) {
      newCategoryInputRef.current?.focus()
    }
  }, [addingCategory])

  const handleConfirmAdd = () => {
    const trimmed = newCategoryName.trim()
    if (trimmed) {
      addCustomCategory(trimmed)
    }
    setNewCategoryName('')
    setAddingCategory(false)
  }

  const handleCalculate = () => {
    router.push('/start/goal/plan')
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-10">
      <header className="py-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start/goal/income')}
            aria-label={t('intent.back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          {/* Still step 2 (goal_setup) in the funnel. */}
          <FunnelProgress total={4} current={2} />
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
            {t('goal.spend.title')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('goal.spend.subtitle')}
          </p>
        </div>
      </header>

      <div className="flex flex-col divide-y divide-border rounded-2xl bg-card shadow-card">
        {rows.map((cat) => {
          const Icon = getCategoryIcon(cat.name)
          const tint = getCategoryTint(cat.name)
          return (
            <div key={cat.slug} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
                  tint.bg,
                  tint.fg
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm leading-body-sm font-medium text-foreground">
                {cat.name}
              </span>
              <CurrencyInput
                data-testid={`spend-${cat.slug}`}
                aria-label={cat.name}
                value={spend[cat.slug] ?? 0}
                onChange={(v) => setSpend(cat.slug, v)}
                className="h-10 w-32 rounded-[10px] text-right text-sm"
              />
            </div>
          )
        })}

        {/* Add another category — inline input row, mirrors budget/spend pattern */}
        {addingCategory ? (
          <div className="flex items-center gap-2 px-4 py-2.5">
            <input
              ref={newCategoryInputRef}
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmAdd()
                if (e.key === 'Escape') {
                  setNewCategoryName('')
                  setAddingCategory(false)
                }
              }}
              placeholder={t('goal.spend.newCategory')}
              className="h-9 min-w-0 flex-1 rounded-[10px] border border-input bg-muted/40 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleConfirmAdd}
              aria-label={t('goal.spend.confirmCategory')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingCategory(true)}
            className="flex w-full items-center justify-center gap-1.5 py-3.5 text-sm leading-body-sm font-semibold text-primary hover:text-primary/80"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('goal.spend.addCategory')}
          </button>
        )}
      </div>

      {/* Calculate my plan */}
      <Button
        className="mt-auto h-[52px] w-full gap-2 rounded-[14px] text-md"
        onClick={handleCalculate}
      >
        {t('goal.spend.cta')}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
