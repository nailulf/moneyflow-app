'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ArrowRight, ChevronLeft, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { useTransactionCategories } from '@/hooks/useTransactionCategories'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous'
import { saveOnboardingPlan, advanceOnboarding } from '@/lib/api/onboarding-funnel'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { estimateSpend } from '@/lib/onboarding/spend-estimate'
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

  const [userId, setUserId] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  // The anonymous user already exists (created on the type screen); resolve its
  // id so we can fetch its real, seeded categories.
  useEffect(() => {
    ensureAnonymousSession()
      .then(setUserId)
      .catch(() => {
        /* categories simply won't load; user can still skip */
      })
  }, [])

  const { categories, isLoading } = useTransactionCategories(userId)

  // Render all of the user's EXPENSE categories, sorted by name for a stable,
  // deterministic order (works for any setup, not just the seeded defaults).
  const rows = useMemo(
    () =>
      categories
        .filter((c) => c.group_type === 'EXPENSE')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  )

  // Pre-fill sensible, income-proportional estimates once the real categories
  // load (design n8X4lA — "Estimate is okay. Tap an amount to adjust it"). Only
  // fill categories the guest hasn't already entered a value for, and only once,
  // so editing/clearing a field is never clobbered. Inputs stay fully editable.
  const totalIncome = (monthlyIncome ?? 0) + incomeSources.reduce((sum, s) => sum + s.amount, 0)
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || rows.length === 0 || totalIncome <= 0) return
    prefilled.current = true
    const current = useFunnelStore.getState().spend
    for (const cat of rows) {
      if (!current[cat.id]) setSpend(cat.id, estimateSpend(cat.name, totalIncome))
    }
  }, [rows, totalIncome, setSpend])

  const handleCalculate = async () => {
    setSaving(true)
    try {
      const allocations = rows
        .map((c) => ({ category_id: c.id, amount: spend[c.id] ?? 0 }))
        .filter((a) => a.amount > 0)
      await saveOnboardingPlan({
        monthly_income: totalIncome,
        period: 'monthly',
        allocations,
      })
      await advanceOnboarding('plan')
      router.push('/start/goal/plan')
    } catch {
      toast.error(t('goal.saveError'))
      setSaving(false)
    }
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
            onClick={() => router.push('/')}
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

      {isLoading || !userId ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-2xl bg-card shadow-card">
          {rows.map((cat) => {
            const Icon = getCategoryIcon(cat.name)
            const tint = getCategoryTint(cat.name)
            return (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5">
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
                  data-testid={`spend-${cat.id}`}
                  aria-label={cat.name}
                  value={spend[cat.id] ?? 0}
                  onChange={(v) => setSpend(cat.id, v)}
                  className="h-10 w-32 rounded-[10px] text-right text-sm"
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Calculate my plan */}
      <Button
        className="mt-auto h-[52px] w-full gap-2 rounded-[14px] text-md"
        disabled={saving || isLoading || !userId}
        onClick={handleCalculate}
      >
        {t('goal.spend.cta')}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
