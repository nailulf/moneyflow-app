'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/contexts/AuthContext'
import { useTransactions } from '@/contexts/TransactionContext'

import { getBudgetPlan, updateBudgetPlan, getAvailableCategories } from '@/lib/api/budget-plans'
import { suggestedAmounts, planDiff } from '@/lib/budget-screen-utils'
import { formatCurrencyCompact } from '@/lib/data-utils'

import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { BudgetAmountsEditor } from '@/components/features/budget/BudgetAmountsEditor'
import { ConfirmChangesSheet } from '@/components/features/budget/ConfirmChangesSheet'

import type { BudgetPlanWithCategories } from '@/lib/api/budget-plans'
import type { CategoryDB } from '@/types/database'

// ─── types ────────────────────────────────────────────────────────────────────

/** Lightweight draft row decoupled from the hook's validation constraints. */
interface DraftRow {
  category_id: string
  category_name: string
  category_color: string
  allocated_amount: number
}

/** Minimal shape used for diffing (immutable original). */
interface OriginalRow {
  category_id: string
  category_name: string
  allocated_amount: number
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizeColor(color: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color
  const raw = color.replace(/^#/, '').padEnd(6, '0').slice(0, 6)
  return `#${raw}`
}

// ─── component ────────────────────────────────────────────────────────────────

export default function BudgetEditPage() {
  const t = useTranslations('budgetCreate')
  const router = useRouter()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') === 'yearly' ? 'yearly' : 'monthly') as
    | 'monthly'
    | 'yearly'

  const { user } = useAuth()
  const { transactions } = useTransactions()

  const [now] = useState(() => new Date())

  // ── plan fetch state ───────────────────────────────────────────────────────
  const [plan, setPlan] = useState<BudgetPlanWithCategories | null | undefined>(undefined) // undefined = loading
  const [loadError, setLoadError] = useState(false)

  // ── draft rows (decoupled from hook validation) ────────────────────────────
  const [draftRows, setDraftRows] = useState<DraftRow[]>([])
  const [original, setOriginal] = useState<OriginalRow[]>([])

  // ── UI state ───────────────────────────────────────────────────────────────
  const [suggestionsOn, setSuggestionsOn] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pending, setPending] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<CategoryDB[]>([])

  // ── fetch plan on mount ───────────────────────────────────────────────────
  // Use a ref to hold stable references to avoid re-firing the effect
  const routerRef = useRef(router)
  routerRef.current = router
  const tRef = useRef(t)
  tRef.current = t

  useEffect(() => {
    if (!user?.id) return
    getBudgetPlan(user.id, period)
      .then((fetched) => {
        if (!fetched) {
          // No plan found → redirect to create
          routerRef.current.replace(`/budget/create?period=${period}`)
          return
        }
        setPlan(fetched)

        const rows: DraftRow[] = fetched.budget_plan_categories.map((c) => ({
          category_id: c.category_id,
          category_name: c.categories.name,
          category_color: normalizeColor(c.categories.color),
          allocated_amount: c.allocated_amount,
        }))
        setDraftRows(rows)

        const orig: OriginalRow[] = fetched.budget_plan_categories.map((c) => ({
          category_id: c.category_id,
          category_name: c.categories.name,
          allocated_amount: c.allocated_amount,
        }))
        setOriginal(orig)
      })
      .catch(() => {
        setLoadError(true)
        toast.error(tRef.current('errors.loadFailed'))
      })
  }, [user?.id, period])

  // ── fetch available categories on mount ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    getAvailableCategories(user.id, period)
      .then(setAvailableCategories)
      .catch(() => {})
  }, [user?.id, period])

  // ── derived state ─────────────────────────────────────────────────────────
  const suggestions = useMemo(() => suggestedAmounts(transactions, now), [transactions, now])

  const draftTotal = draftRows.reduce((s, r) => s + r.allocated_amount, 0)
  const originalTotal = original.reduce((s, r) => s + r.allocated_amount, 0)

  // Validation: all rows must exist, total > 0, no negative amounts
  const draftRowsValid =
    draftRows.length > 0 &&
    draftTotal > 0 &&
    draftRows.every((r) => r.allocated_amount >= 0)

  // Compute diff between original and current draft
  const diff = useMemo(
    () =>
      planDiff(
        original,
        draftRows.map((r) => ({
          category_id: r.category_id,
          category_name: r.category_name,
          allocated_amount: r.allocated_amount,
        }))
      ),
    [original, draftRows]
  )

  const hasChanges = diff.length > 0

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleAmountChange = useCallback((id: string, amt: number) => {
    setDraftRows((rows) => rows.map((r) => (r.category_id === id ? { ...r, allocated_amount: amt } : r)))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setDraftRows((rows) => rows.filter((r) => r.category_id !== id))
  }, [])

  const handleToggleSuggestions = useCallback(
    (on: boolean) => {
      setSuggestionsOn(on)
      if (on) {
        setDraftRows((rows) =>
          rows.map((r) => {
            if (r.allocated_amount === 0) {
              const suggested = suggestions.get(r.category_id)
              if (suggested !== undefined) return { ...r, allocated_amount: suggested }
            }
            return r
          })
        )
      }
    },
    [suggestions]
  )

  const pickedIds = useMemo(() => new Set(draftRows.map((r) => r.category_id)), [draftRows])
  const unpickedCategories = availableCategories.filter((c) => !pickedIds.has(c.id))

  const handlePickCategory = useCallback(
    (cat: CategoryDB) => {
      const color = normalizeColor(cat.color)
      const suggested = suggestionsOn ? (suggestions.get(cat.id) ?? 0) : 0
      setDraftRows((rows) => [
        ...rows,
        {
          category_id: cat.id,
          category_name: cat.name,
          category_color: color,
          allocated_amount: suggested,
        },
      ])
      setShowPicker(false)
    },
    [suggestions, suggestionsOn]
  )

  // draftRows ref so handleApply always sees latest without re-creating
  const draftRowsRef = useRef(draftRows)
  draftRowsRef.current = draftRows
  const draftTotalRef = useRef(draftTotal)
  draftTotalRef.current = draftTotal

  const handleApply = useCallback(async () => {
    if (pending || !plan) return
    setPending(true)
    try {
      const rows = draftRowsRef.current
      const total = draftTotalRef.current
      await updateBudgetPlan({
        id: plan.id,
        total_amount: total,
        currency: plan.currency,
        categories: rows.map((r) => ({
          category_id: r.category_id,
          allocated_amount: r.allocated_amount,
        })),
      })
      routerRef.current.push('/budget')
    } catch {
      toast.error(tRef.current('errors.saveFailed'))
      // keep sheet open on error
    } finally {
      setPending(false)
    }
  }, [pending, plan])

  // ── render: loading ───────────────────────────────────────────────────────
  if (plan === undefined && !loadError) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 pt-16 pb-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    )
  }

  // ── render: error ─────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 pt-16 pb-10">
        <p className="text-sm leading-body-sm text-destructive">{t('errors.loadFailed')}</p>
        <button
          type="button"
          onClick={() => router.push('/budget')}
          className="text-sm leading-body-sm font-semibold text-primary"
        >
          {t('created.cta')}
        </button>
      </div>
    )
  }

  // ── render: main ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-3 pb-10 md:pt-8">
      <CreateFlowHeader
        title={t('editTitle')}
        onBack={() => router.push('/budget')}
        backLabel={t('editTitle')}
      />

      <BudgetAmountsEditor
        rows={draftRows}
        suggestions={suggestions}
        suggestionsOn={suggestionsOn}
        onToggleSuggestions={handleToggleSuggestions}
        onAmountChange={handleAmountChange}
        onRemove={handleRemove}
        onAddCategory={() => setShowPicker(true)}
        totalAllocated={draftTotal}
        currency={plan?.currency ?? 'IDR'}
      />

      {/* inline category picker */}
      {showPicker && (
        <div className="flex flex-col gap-1 rounded-2xl bg-card p-3 shadow-card">
          <p className="px-1 text-sm leading-body-sm font-semibold text-foreground">
            {t('amounts.pickCategory')}
          </p>
          {unpickedCategories.length === 0 ? (
            <p className="px-1 text-sm leading-body-sm text-muted-foreground">
              {t('amounts.addCategory')}
            </p>
          ) : (
            unpickedCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handlePickCategory(cat)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm leading-body-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: cat.color }}
                  aria-hidden="true"
                />
                {cat.name}
              </button>
            ))
          )}
        </div>
      )}

      {/* Old → new total context line when there are changes */}
      {hasChanges && (
        <p className="flex items-center justify-center gap-1.5 text-xs leading-caption text-muted-foreground">
          <span>{formatCurrencyCompact(originalTotal, plan?.currency ?? 'IDR')}</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          <span>{formatCurrencyCompact(draftTotal, plan?.currency ?? 'IDR')}</span>
        </p>
      )}

      {/* sticky footer Apply button */}
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={!hasChanges || !draftRowsValid || pending}
        className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {t('applyChanges')}
      </button>

      {!hasChanges && (
        <p className="text-center text-xs leading-caption text-muted-foreground">
          {t('noChanges')}
        </p>
      )}

      <ConfirmChangesSheet
        open={showConfirm}
        diff={diff}
        currency={plan?.currency ?? 'IDR'}
        pending={pending}
        onApply={handleApply}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
