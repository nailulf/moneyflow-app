'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

/** Seeded TRANSFER category the savings allocation is booked against. */
const SAVINGS_TRANSFER_NAME = 'Savings transfer'

/** Budget flow step 3 (design tAKTn) — estimate monthly cost of living by category. */
export default function BudgetSpendPage() {
  const t = useTranslations('start')
  const router = useRouter()

  const budgetIncome = useFunnelStore((s) => s.budgetIncome)
  const savingsAmount = useFunnelStore((s) => s.savingsAmount)
  const budgetSpend = useFunnelStore((s) => s.budgetSpend)
  const setBudgetSpend = useFunnelStore((s) => s.setBudgetSpend)

  const [userId, setUserId] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  // The anonymous user already exists (created on the income screen); resolve
  // its id so we can fetch its real, seeded categories.
  useEffect(() => {
    ensureAnonymousSession()
      .then(setUserId)
      .catch(() => {
        /* categories simply won't load; user can still skip */
      })
  }, [])

  const { categories, isLoading } = useTransactionCategories(userId)

  // All EXPENSE categories, sorted by name for a stable, deterministic order.
  const rows = useMemo(
    () =>
      categories
        .filter((c) => c.group_type === 'EXPENSE')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  )

  const total = useMemo(
    () => rows.reduce((sum, c) => sum + (budgetSpend[c.id] ?? 0), 0),
    [rows, budgetSpend]
  )

  const handleSeePlan = async () => {
    setSaving(true)
    try {
      const allocations = rows
        .map((c) => ({ category_id: c.id, amount: budgetSpend[c.id] ?? 0 }))
        .filter((a) => a.amount > 0)

      // Book the savings target against the seeded "Savings transfer" category
      // so the persisted budget plan reflects the saving intent, not just spend.
      const savingsCat = categories.find(
        (c) => c.group_type === 'TRANSFER' && c.name === SAVINGS_TRANSFER_NAME
      )
      if (savingsCat && (savingsAmount ?? 0) > 0) {
        allocations.push({ category_id: savingsCat.id, amount: savingsAmount ?? 0 })
      }

      await saveOnboardingPlan({
        monthly_income: budgetIncome ?? 0,
        period: 'monthly',
        allocations,
      })
      await advanceOnboarding('plan')
      router.push('/start/budget/plan')
    } catch {
      toast.error(t('budget.saveError'))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-10">
      <header className="py-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start/budget/savings')}
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
            {t('budget.spend.title')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('budget.spend.subtitle')}
          </p>
        </div>
      </header>

      {isLoading || !userId ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((cat) => {
            const Icon = getCategoryIcon(cat.name)
            const tint = getCategoryTint(cat.name)
            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card"
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]',
                    tint.bg,
                    tint.fg
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-md leading-body-lg font-medium text-foreground">
                  {cat.name}
                </span>
                <CurrencyInput
                  data-testid={`budget-spend-${cat.id}`}
                  aria-label={cat.name}
                  value={budgetSpend[cat.id] ?? 0}
                  onChange={(v) => setBudgetSpend(cat.id, v)}
                  className="h-11 w-32 rounded-[12px] text-right"
                />
              </div>
            )
          })}

          {/* Total expenses summary */}
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-hero-gradient px-4 py-4 text-hero-foreground shadow-floating">
            <span className="text-sm leading-body-sm font-medium text-hero-muted">
              {t('budget.spend.totalLabel')}
            </span>
            <span className="text-xl leading-title-4 font-bold">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      )}

      <Button
        className="mt-auto h-[52px] w-full gap-2 rounded-[14px] text-md"
        disabled={saving || isLoading || !userId}
        onClick={handleSeePlan}
      >
        {t('budget.spend.cta')}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
