'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ArrowRight, ChevronLeft, Loader2, Plus, Wallet } from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { StickyCtaBar } from '@/components/features/budget/StickyCtaBar'
import { useTransactionCategories } from '@/hooks/useTransactionCategories'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { estimateSpend } from '@/lib/onboarding/spend-estimate'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

/**
 * Budget flow step 3 (design tAKTn / BU3) — estimate monthly cost of living.
 *
 * Renders the user's REAL, seeded EXPENSE categories (now aligned to the design:
 * Housing & rent, Food & groceries, Transport, Bills & subscriptions, Lifestyle
 * & fun). `budgetSpend` is keyed by category id, so the plan screen can persist
 * allocations against those ids directly — no find-or-create, no duplicates.
 */
export default function BudgetSpendPage() {
  const t = useTranslations('start')
  const router = useRouter()

  const budgetIncome = useFunnelStore((s) => s.budgetIncome)
  const budgetSpend = useFunnelStore((s) => s.budgetSpend)
  const setBudgetSpend = useFunnelStore((s) => s.setBudgetSpend)

  const [userId, setUserId] = useState<string | undefined>()

  // The anonymous user already exists (created earlier in the flow); resolve its
  // id so we can fetch its real, seeded categories.
  useEffect(() => {
    ensureAnonymousSession()
      .then(setUserId)
      .catch(() => {
        /* categories simply won't load; user can still skip */
      })
  }, [])

  const { categories, isLoading, addCategory, isAdding } = useTransactionCategories(userId)

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
  // load (design tAKTn — "Estimate is okay. Tap an amount to adjust it"). Only
  // fill categories the guest hasn't already entered a value for, and only once,
  // so editing/clearing a field is never clobbered. Inputs stay fully editable.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || rows.length === 0 || !budgetIncome || budgetIncome <= 0) return
    prefilled.current = true
    const current = useFunnelStore.getState().budgetSpend
    for (const cat of rows) {
      if (!current[cat.id]) setBudgetSpend(cat.id, estimateSpend(cat.name, budgetIncome))
    }
  }, [rows, budgetIncome, setBudgetSpend])

  const total = useMemo(
    () => rows.reduce((sum, c) => sum + (budgetSpend[c.id] ?? 0), 0),
    [rows, budgetSpend]
  )

  const handleAddCategory = async () => {
    try {
      await addCategory(t('budget.spend.newCategory'), 'EXPENSE')
    } catch {
      toast.error(t('budget.saveError'))
    }
  }

  const handleSeeOptions = () => {
    router.push('/start/budget/plan')
  }

  return (
    <div className="flex flex-1 flex-col px-5">
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
          <FunnelProgress total={5} current={3} />
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
        <>
          {/* Single card holding the category rows */}
          <div className="mt-2 rounded-2xl bg-card px-4 shadow-card">
            {rows.map((cat, i) => {
              const Icon = getCategoryIcon(cat.name)
              const tint = getCategoryTint(cat.name)
              return (
                <div
                  key={cat.id}
                  className={cn(
                    'flex items-center gap-3 py-3',
                    i < rows.length - 1 && 'border-b border-border/60'
                  )}
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
                    className="h-9 w-[116px] rounded-[10px] border-transparent bg-muted/40 pl-7 pr-2 text-right text-sm font-semibold focus-visible:bg-card"
                  />
                </div>
              )
            })}

            <button
              type="button"
              onClick={handleAddCategory}
              disabled={isAdding}
              className="flex w-full items-center justify-center gap-1.5 py-3.5 text-sm leading-body-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('budget.spend.addCategory')}
            </button>
          </div>

          {/* Navy summary row — cost of living today */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-hero-gradient px-4 py-4 text-hero-foreground shadow-floating">
            <Wallet className="h-5 w-5 shrink-0 text-hero-muted" aria-hidden="true" />
            <span className="flex-1 text-sm leading-body-sm font-medium text-hero-muted">
              {t('budget.spend.totalLabel')}
            </span>
            <span className="text-lg leading-title-5 font-bold">{formatCurrencyCompact(total)}</span>
          </div>
        </>
      )}

      <StickyCtaBar>
        <Button
          className="h-[52px] w-full gap-2 rounded-[14px] text-md"
          disabled={isLoading || !userId}
          onClick={handleSeeOptions}
        >
          {t('budget.spend.cta')}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </StickyCtaBar>
    </div>
  )
}
