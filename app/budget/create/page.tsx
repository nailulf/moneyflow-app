'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle2, Loader2, Calendar, CalendarRange } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/contexts/AuthContext'
import { useTransactions } from '@/contexts/TransactionContext'
import { useBudgetAllocation } from '@/hooks/useBudgetAllocation'
import { useBudgetSnapshot } from '@/hooks/useBudgetSnapshot'

import { createBudgetPlan, getAvailableCategories, getBudgetPlan } from '@/lib/api/budget-plans'
import { getBudgetTemplates } from '@/lib/api/onboarding'
import {
  incomeReference,
  suggestedAmounts,
  seedFromSnapshot,
  seedFromTemplate,
  annualizedIncome,
} from '@/lib/budget-screen-utils'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'

import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { InfoBanner } from '@/components/features/accounts/create/InfoBanner'
import { BudgetAmountsEditor } from '@/components/features/budget/BudgetAmountsEditor'
import { BudgetPreviewCard, type PreviewRow } from '@/components/features/budget/BudgetPreviewCard'
import { LockedCategoriesNotice } from '@/components/features/budget/LockedCategoriesNotice'
import { StartFromCards, type StartFrom } from '@/components/features/budget/StartFromCards'
import { cn } from '@/lib/utils'

import type { CategoryDB } from '@/types/database'
import type { BudgetTemplateDB } from '@/types/database'

// ─── types ────────────────────────────────────────────────────────────────────

type Step = 'entry' | 'amounts' | 'preview' | 'created'

/** Lightweight draft row used during editing (no hook validation constraints). */
interface DraftRow {
  category_id: string
  category_name: string
  category_color: string
  allocated_amount: number
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Ensure the color is a valid 6-char hex string (e.g. '#a' → '#aa0000'). */
function normalizeColor(color: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color
  const raw = color.replace(/^#/, '').padEnd(6, '0').slice(0, 6)
  return `#${raw}`
}

// ─── component ────────────────────────────────────────────────────────────────

export default function BudgetCreatePage() {
  const t = useTranslations('budgetCreate')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') === 'yearly' ? 'yearly' : 'monthly') as
    | 'monthly'
    | 'yearly'

  const { user } = useAuth()
  const { transactions } = useTransactions()

  // stable "now" for the whole session
  const [now] = useState(() => new Date())

  // ── step tracking ──────────────────────────────────────────────────────────
  const allSteps: Step[] =
    period === 'monthly'
      ? ['entry', 'amounts', 'preview', 'created']
      : ['amounts', 'preview', 'created']
  const [stepIndex, setStepIndex] = useState(0)
  const currentStep = allSteps[stepIndex]
  const totalSteps = allSteps.length

  // ── draft rows (amounts step) ──────────────────────────────────────────────
  // We manage category rows as local draft state to avoid hook validation
  // constraints (othersAmount) during free-form entry. The hook is only used
  // for the final toDatabaseFormat() call on the preview/save step.
  const [draftRows, setDraftRows] = useState<DraftRow[]>([])

  // ── allocation hook (for toDatabaseFormat + preview) ──────────────────────
  const { loadFromExistingBudget, toDatabaseFormat, allocationState, totalAllocated } =
    useBudgetAllocation(0, 'IDR')

  // ── remote data ────────────────────────────────────────────────────────────
  const [availableCategories, setAvailableCategories] = useState<CategoryDB[]>([])
  const [templates, setTemplates] = useState<BudgetTemplateDB[]>([])
  const [monthlyLockedCategories, setMonthlyLockedCategories] = useState<Array<{ id: string; name: string }>>([])
  const [pending, setPending] = useState(false)

  // entry step UI state
  const [startFrom, setStartFrom] = useState<StartFrom>('scratch')
  const [showPicker, setShowPicker] = useState(false)
  const [suggestionsOn, setSuggestionsOn] = useState(true)

  // track last seeded start-from value to avoid re-seeding on back navigation
  const lastSeedRef = useRef<string | null>(null)

  // previous period snapshot for "copy" seeding
  const prevYear =
    period === 'monthly'
      ? now.getMonth() === 0
        ? now.getFullYear() - 1
        : now.getFullYear()
      : now.getFullYear() - 1
  const prevMonth =
    period === 'monthly' ? (now.getMonth() === 0 ? 12 : now.getMonth()) : undefined
  const { snapshot: prevSnapshot, noSnapshot } = useBudgetSnapshot(period, prevYear, prevMonth)
  const copyAvailable = !noSnapshot && prevSnapshot !== null

  // fetch available categories + templates on mount
  useEffect(() => {
    if (!user?.id) return
    getAvailableCategories(user.id, period)
      .then(setAvailableCategories)
      .catch(() => {})
    getBudgetTemplates()
      .then(setTemplates)
      .catch(() => {})
    if (period === 'yearly') {
      getBudgetPlan(user.id, 'monthly')
        .then((plan) =>
          setMonthlyLockedCategories(
            plan ? plan.budget_plan_categories.map((c) => ({ id: c.category_id, name: c.categories.name })) : []
          )
        )
        .catch(() => setMonthlyLockedCategories([]))
    }
  }, [user?.id, period])

  // ── helpers ────────────────────────────────────────────────────────────────
  const income = incomeReference(transactions, period, now)
  const annualIncome = useMemo(() => annualizedIncome(transactions, now), [transactions, now])
  const suggestions = useMemo(() => suggestedAmounts(transactions, now), [transactions, now])

  const periodLabel =
    period === 'monthly'
      ? t('monthlyLabel', {
          month: now.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
        })
      : t('yearlyLabel', { year: now.getFullYear() })

  const draftTotal = draftRows.reduce((s, r) => s + r.allocated_amount, 0)

  // Validation: all rows must exist, total > 0, and no negative amounts
  const draftRowsValid =
    draftRows.length > 0 &&
    draftTotal > 0 &&
    draftRows.every((r) => r.allocated_amount >= 0)

  // ── navigation ─────────────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1)
    } else {
      router.push('/budget')
    }
  }, [stepIndex, router])

  const goNext = useCallback(() => {
    setStepIndex((i) => i + 1)
  }, [])

  // ── entry → amounts ────────────────────────────────────────────────────────
  const handleEntryNext = useCallback(() => {
    // Only re-seed when draftRows is empty OR the start-from option changed
    const seedKey = startFrom
    if (draftRows.length === 0 || lastSeedRef.current !== seedKey) {
      let initialRows: DraftRow[] = []

      if (startFrom === 'copy' && prevSnapshot) {
        const seeded = seedFromSnapshot(prevSnapshot as Parameters<typeof seedFromSnapshot>[0])
        initialRows = seeded.categories.map((c) => ({
          ...c,
          category_color: normalizeColor(c.category_color),
        }))
      } else if (startFrom === 'template' && templates.length > 0) {
        const tpl = templates[0]
        initialRows = seedFromTemplate(
          tpl as Parameters<typeof seedFromTemplate>[0],
          income,
          availableCategories.map((c) => ({ id: c.id, name: c.name, color: normalizeColor(c.color) }))
        ).map((r) => ({ ...r, category_color: normalizeColor(r.category_color) }))
      }
      // scratch → empty rows

      setDraftRows(initialRows)
      lastSeedRef.current = seedKey
    }

    goNext()
  }, [startFrom, prevSnapshot, templates, income, availableCategories, draftRows.length, goNext])

  // ── amounts → preview: commit draft rows to the allocation hook ────────────
  const handleAmountsPreview = useCallback(() => {
    if (!draftRowsValid) return
    const total = draftRows.reduce((s, r) => s + r.allocated_amount, 0)
    loadFromExistingBudget(
      total,
      draftRows,
      'IDR'
    )
    goNext()
  }, [draftRows, draftRowsValid, loadFromExistingBudget, goNext])

  // ── preview → save ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (pending || !draftRowsValid) return
    setPending(true)
    try {
      await createBudgetPlan({
        userId: user!.id,
        period,
        total_amount: totalAllocated,
        currency: 'IDR',
        categories: toDatabaseFormat(),
      })
      goNext() // → created
    } catch {
      toast.error(t('errors.saveFailed'))
    } finally {
      setPending(false)
    }
  }, [pending, draftRowsValid, user, period, totalAllocated, toDatabaseFormat, goNext, t])

  // ── draft amount handlers ──────────────────────────────────────────────────
  const handleAmountChange = useCallback((id: string, amt: number) => {
    setDraftRows((rows) => rows.map((r) => (r.category_id === id ? { ...r, allocated_amount: amt } : r)))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setDraftRows((rows) => rows.filter((r) => r.category_id !== id))
  }, [])

  // ── suggestions toggle ─────────────────────────────────────────────────────
  const handleToggleSuggestions = useCallback(
    (on: boolean) => {
      setSuggestionsOn(on)
      if (on) {
        // apply suggestions to rows that have no amount yet
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

  // ── picker ─────────────────────────────────────────────────────────────────
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

  // ── preview rows (from hook, after commit) ─────────────────────────────────
  const previewRows: PreviewRow[] = allocationState.categories.map((row) => ({
    categoryId: row.category_id,
    name: row.category_name,
    amount: row.allocated_amount,
    pct: totalAllocated > 0 ? Math.round((row.allocated_amount / totalAllocated) * 100) : 0,
  }))

  // ── step label ─────────────────────────────────────────────────────────────
  const stepLabel =
    currentStep !== 'created'
      ? t('stepOf', { step: stepIndex + 1, total: totalSteps })
      : undefined

  // ── period-type card options ───────────────────────────────────────────────
  const PERIOD_OPTIONS = [
    { value: 'monthly' as const, icon: Calendar, labelKey: 'periodType.monthly', hintKey: 'periodType.monthlyHint' },
    { value: 'yearly' as const, icon: CalendarRange, labelKey: 'periodType.yearly', hintKey: 'periodType.yearlyHint' },
  ] as const

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-3 pb-10 md:pt-8">
      {currentStep !== 'created' && (
        <CreateFlowHeader
          title={t('createTitle')}
          onBack={goBack}
          backLabel={t('createTitle')}
          stepLabel={stepLabel}
        />
      )}

      {/* ── STEP 1: entry (monthly only) ─────────────────────────────────── */}
      {currentStep === 'entry' && (
        <>
          {/* Period type selector cards */}
          <div className="flex flex-col gap-2">
            {PERIOD_OPTIONS.map((opt) => {
              const active = period === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (!active) {
                      setDraftRows([])
                      lastSeedRef.current = null
                      setStepIndex(0)
                      router.replace(`/budget/create?period=${opt.value}`)
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left shadow-card transition-colors',
                    active && 'ring-2 ring-primary'
                  )}
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]', active ? 'bg-selected' : 'bg-muted')}>
                    <opt.icon className={cn('h-4 w-4', active ? 'text-selected-foreground' : 'text-muted-foreground')} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-body-sm font-semibold text-foreground">{t(opt.labelKey)}</span>
                    <span className="block text-tiny text-muted-foreground">{t(opt.hintKey)}</span>
                  </span>
                  <span aria-hidden="true" className={cn('h-4 w-4 shrink-0 rounded-full border-2', active ? 'border-primary bg-primary' : 'border-border')} />
                </button>
              )
            })}
          </div>

          {income > 0 && (
            <InfoBanner variant="success">
              {t('income', { amount: formatCurrency(income, 'IDR') })}
            </InfoBanner>
          )}
          <StartFromCards
            value={startFrom}
            onChange={setStartFrom}
            copyAvailable={copyAvailable}
            copyHint={copyAvailable ? undefined : t('startFrom.copyHint')}
          />
          <button
            type="button"
            onClick={handleEntryNext}
            className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground transition-transform active:scale-[0.99]"
          >
            {t('next')}
          </button>
        </>
      )}

      {/* ── STEP 2: amounts ───────────────────────────────────────────────── */}
      {currentStep === 'amounts' && (
        <>
          {period === 'yearly' && (
            <>
              <LockedCategoriesNotice categories={monthlyLockedCategories} />
              {annualIncome > 0 && (
                <InfoBanner variant="success">
                  {t('annualIncome', { amount: formatCurrency(annualIncome, 'IDR') })}
                </InfoBanner>
              )}
            </>
          )}

          {/* Yearly copy-from-last-year card */}
          {period === 'yearly' && prevSnapshot && draftRows.length === 0 && (
            <button
              type="button"
              onClick={() => {
                const seeded = seedFromSnapshot(prevSnapshot as Parameters<typeof seedFromSnapshot>[0])
                const rows = seeded.categories.map((c) => ({
                  ...c,
                  category_color: normalizeColor(c.category_color),
                }))
                setDraftRows(rows)
                lastSeedRef.current = 'yearly-copy'
              }}
              className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left shadow-card transition-colors hover:bg-muted/50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-selected">
                <CalendarRange className="h-4 w-4 text-selected-foreground" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 text-sm leading-body-sm font-semibold text-foreground">
                {t('startFrom.copy')}
              </span>
            </button>
          )}

          <BudgetAmountsEditor
            rows={draftRows}
            suggestions={suggestions}
            suggestionsOn={suggestionsOn}
            onToggleSuggestions={handleToggleSuggestions}
            onAmountChange={handleAmountChange}
            onRemove={handleRemove}
            onAddCategory={() => setShowPicker(true)}
            totalAllocated={draftTotal}
            currency="IDR"
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

          {/* Validation hint: show when rows exist but total is 0 or any amount is negative */}
          {draftRows.length > 0 && !draftRowsValid && (
            <p className="text-center text-xs leading-caption text-destructive/80">
              {t('errors.totalRequired')}
            </p>
          )}
          {draftRows.length === 0 && (
            <p className="text-center text-xs leading-caption text-destructive/80">
              {t('errors.totalRequired')}
            </p>
          )}

          <button
            type="button"
            onClick={handleAmountsPreview}
            disabled={!draftRowsValid}
            className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {t('amounts.preview')}
          </button>
        </>
      )}

      {/* ── STEP 3: preview ───────────────────────────────────────────────── */}
      {currentStep === 'preview' && (
        <>
          <BudgetPreviewCard
            periodLabel={periodLabel}
            total={totalAllocated}
            income={period === 'yearly' ? annualIncome : income}
            currency="IDR"
            rows={previewRows}
            period={period}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !draftRowsValid}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {t('preview.save')}
          </button>
        </>
      )}

      {/* ── STEP 4: created ───────────────────────────────────────────────── */}
      {currentStep === 'created' && (
        <div className="flex flex-col items-center gap-6 pt-16">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
          </span>
          <p className="text-2xl leading-title-4 font-bold text-foreground">
            {t('created.title')}
          </p>
          <button
            type="button"
            onClick={() => router.push('/budget')}
            className="flex h-[52px] w-full max-w-xs items-center justify-center rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground"
          >
            {t('created.cta')}
          </button>
        </div>
      )}
    </div>
  )
}
