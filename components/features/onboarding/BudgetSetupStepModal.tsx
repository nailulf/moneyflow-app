'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useCategories } from '@/contexts/CategoryContext'
import { useBudgetTemplates } from '@/hooks/useOnboardingQuery'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Progress } from '@/components/ui/atoms/progress'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react'

export function BudgetSetupStepModal() {
  const t = useTranslations('onboarding.budgetSetup')
  const { user } = useAuth()
  const { prevPhase, setWizardData, goToPhase, loading, isPreviewMode } = useOnboarding()
  const { categories } = useCategories()
  const { data: templates, isLoading: templatesLoading } = useBudgetTemplates()

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [incomeError, setIncomeError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId)

  // Validate monthly income: must be a finite number, 0 <= x <= 1e12.
  // Returns null when valid, or a translated error message.
  const validateIncome = (raw: string): string | null => {
    if (!raw.trim()) return null // empty is handled by the disabled state
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return t('errors.incomeInvalid')
    if (parsed < 0) return t('errors.incomeMin')
    if (parsed > 1_000_000_000_000) return t('errors.incomeMax')
    return null
  }

  const handleIncomeChange = (value: string) => {
    setMonthlyIncome(value)
    setIncomeError(validateIncome(value))
  }

  const isIncomeValid = monthlyIncome.trim().length > 0 && incomeError === null

  // Heuristic split of expense categories into needs vs wants. The user's
  // categories don't carry a "needs"/"wants" tag, so we use canonical names
  // (matching the template seed in migration 024) as a hint and fall back to
  // an even split if the user has renamed/replaced everything. This keeps
  // the allocation faithful to whatever categories the user actually has,
  // which is the whole point of pulling from the categories step.
  const NEEDS_HINTS = [
    'Food & Dining', 'Food and Eating', 'Groceries', 'Transportation', 'Bills & Utilities',
    'Bills', 'Utilities', 'Healthcare', 'Health', 'Health & Fitness', 'Education', 'Housing',
    'Rent', 'Mortgage', 'Insurance',
  ]
  const WANTS_HINTS = [
    'Shopping', 'Entertainment', 'Travel', 'Personal Care', 'Hobbies', 'Dining Out',
    'Subscriptions', 'Gifts',
  ]

  const expenseCategories = categories.filter(c => c.group_type === 'EXPENSE')
  const transferCategories = categories.filter(c => c.group_type === 'TRANSFER')

  const matchByName = (haystack: typeof expenseCategories, hints: string[]) => {
    const lc = hints.map(h => h.toLowerCase())
    return haystack.filter(c => lc.includes(c.name.toLowerCase()))
  }

  // Resolve which categories receive each bucket's allocation. Falls back
  // to "all expense categories" when no canonical hint matches so the
  // allocation total always equals the income (no silently-dropped %).
  const resolveBucket = (bucket: 'needs' | 'wants' | 'savings') => {
    if (bucket === 'savings') {
      // Prefer transfer categories (Savings transfer etc.). If the user
      // deleted them all, fall back to expense categories so the savings
      // % still gets allocated somewhere visible.
      return transferCategories.length > 0 ? transferCategories : expenseCategories
    }
    const hints = bucket === 'needs' ? NEEDS_HINTS : WANTS_HINTS
    const matched = matchByName(expenseCategories, hints)
    if (matched.length > 0) return matched
    // No canonical match — distribute across all expense categories. This
    // is the "user customised everything" path.
    return expenseCategories
  }

  // Distribute each bucket's amount evenly across its resolved categories.
  // Tracks any rounding remainder and pushes it onto the last category in
  // the bucket so the per-bucket total exactly equals (income * pct / 100).
  const calculateAllocations = () => {
    if (!selectedTemplate || !monthlyIncome) return {}
    const income = parseFloat(monthlyIncome) || 0
    if (!income) return {}

    const allocations: Record<string, number> = {}
    const templateAllocations = selectedTemplate.allocations as { needs: number; wants: number; savings: number }

    ;(['needs', 'wants', 'savings'] as const).forEach(bucket => {
      const percentage = templateAllocations[bucket] || 0
      const groupTotal = Math.round((income * percentage) / 100)
      const targets = resolveBucket(bucket)
      if (targets.length === 0 || groupTotal === 0) return

      const per = Math.floor(groupTotal / targets.length)
      const remainder = groupTotal - per * targets.length

      targets.forEach((category, i) => {
        const previous = allocations[category.id] ?? 0
        // The same category may receive funds from multiple buckets when
        // hints overlap (e.g. an expense fallback for savings). Sum them.
        const share = per + (i === targets.length - 1 ? remainder : 0)
        allocations[category.id] = previous + share
      })
    })

    return allocations
  }

  // Build per-group preview rows. Each row mirrors what calculateAllocations
  // does so the preview list reflects the actual categories that will be
  // funded — not a stale list from the template seed.
  const getGroupBreakdown = () => {
    if (!selectedTemplate || !monthlyIncome) return []
    const income = parseFloat(monthlyIncome) || 0
    const templateAllocations = selectedTemplate.allocations as { needs: number; wants: number; savings: number }

    return (['needs', 'wants', 'savings'] as const).map(bucket => {
      const percentage = templateAllocations[bucket] || 0
      const groupTotal = Math.round((income * percentage) / 100)
      const targets = resolveBucket(bucket)
      const per = targets.length > 0 ? Math.floor(groupTotal / targets.length) : 0
      const remainder = targets.length > 0 ? groupTotal - per * targets.length : 0

      return {
        key: bucket,
        percentage,
        groupTotal,
        targets: targets.map((category, i) => ({
          category,
          amount: per + (i === targets.length - 1 ? remainder : 0),
        })),
      }
    })
  }

  const allocations = calculateAllocations()
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0)
  const income = parseFloat(monthlyIncome) || 0
  const allocationPercentage = income > 0 ? Math.round((totalAllocated / income) * 100) : 0
  const groupBreakdown = getGroupBreakdown()

  const handleCreateBudget = async () => {
    if (!user?.id) return

    const validationError = validateIncome(monthlyIncome)
    if (validationError || !monthlyIncome.trim()) {
      setIncomeError(validationError ?? t('errors.incomeRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      setWizardData({
        budget: {
          templateId: selectedTemplateId,
          monthlyIncome: income,
          allocations
        }
      })

      if (isPreviewMode) {
        await goToPhase('completed')
        return
      }

      const categoryEntries = Object.entries(allocations)
        .filter(([, amount]) => amount > 0)
        .map(([categoryId, amount]) => ({
          category_id: categoryId,
          allocated_amount: amount,
        }))

      const budgetPayload = {
        userId: user.id,
        total_amount: income,
        period: 'monthly' as const,
        currency: 'IDR',
        categories: categoryEntries,
      }

      let response = await fetch('/api/budget-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetPayload),
      })

      // Budget plan already exists — fetch it and update via PUT
      if (response.status === 409) {
        const plansRes = await fetch(`/api/budget-plans?userId=${user.id}&period=monthly`)
        const existingPlan = plansRes.ok ? await plansRes.json() : null

        if (existingPlan?.id) {
          response = await fetch('/api/budget-plans', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: existingPlan.id,
              total_amount: income,
              currency: 'IDR',
              categories: categoryEntries,
            }),
          })
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create budget')
      }

      toast.success('Budget plan created!', { id: 'budget-setup' })
      await goToPhase('completed')
    } catch (error) {
      console.error('Error creating budget:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to create budget',
        { id: 'budget-setup' }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = async () => {
    await prevPhase()
  }

  if (templatesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    // Flex column owning its own scrollable body + pinned footer.
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-1">
      {/* Monthly Income */}
      <div className="space-y-1.5">
        <Label htmlFor="income">{t('monthlyIncomeLabel')}</Label>
        <Input
          id="income"
          type="number"
          inputMode="numeric"
          min={0}
          max={1_000_000_000_000}
          step="any"
          placeholder={t('incomePlaceholder')}
          value={monthlyIncome}
          onChange={(e) => handleIncomeChange(e.target.value)}
          disabled={isSubmitting}
          aria-invalid={incomeError !== null}
          aria-describedby={incomeError ? 'income-error' : undefined}
          className={cn('h-11', incomeError && 'border-destructive focus-visible:ring-destructive')}
        />
        {incomeError && (
          <p id="income-error" className="text-xs text-destructive">
            {incomeError}
          </p>
        )}
      </div>

      {/* Budget Templates */}
      <div className="space-y-1.5">
        <Label>{t('chooseBudgetTemplate')}</Label>
        <div className="space-y-2">
          {templates?.map((template) => {
            const templateAllocations = template.allocations as { needs: number; wants: number; savings: number }
            const isSelected = selectedTemplateId === template.id
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                disabled={isSubmitting}
                className={cn(
                  'w-full text-left p-3 rounded-lg border-2 transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t('needs')}: {templateAllocations.needs}% · {t('wants')}: {templateAllocations.wants}% · {t('savings')}: {templateAllocations.savings}%
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Allocation Preview — per-group & per-category breakdown */}
      {selectedTemplateId && income > 0 && (
        <div className="space-y-2.5 p-3 bg-muted/30 rounded-lg">
          <div className="flex justify-between items-center text-sm font-medium">
            <span>{t('budgetPreview')}</span>
            <span>Rp {totalAllocated.toLocaleString('id-ID')}</span>
          </div>

          <Progress value={allocationPercentage} className="h-1.5" />

          <p className="text-xs text-muted-foreground">
            {t('incomeAllocated', { percent: allocationPercentage })}
          </p>

          <div className="space-y-3 pt-1 border-t border-border/50">
            {groupBreakdown.map(({ key, percentage, groupTotal, targets }) => (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold capitalize text-foreground">
                    {key} <span className="text-muted-foreground font-normal">({percentage}%)</span>
                  </span>
                  <span className="text-foreground font-medium">
                    Rp {groupTotal.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="space-y-0.5 pl-2">
                  {targets.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No matching categories — add one in the previous step
                    </p>
                  ) : (
                    targets.map(({ category, amount }) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="truncate text-muted-foreground">
                            {category.name}
                          </span>
                        </div>
                        <span className="text-muted-foreground shrink-0 pl-2">
                          Rp {amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {t('editNote')}
      </p>
      </div>

      {/* Footer — pinned to the bottom of the dialog. No skip per design
          (pen frame tGz7F has Back + Create only — see GZaJY / RlVZ2).
          Welcome and Completion still expose skip text links. */}
      <div className="flex flex-col-reverse gap-2 border-t pt-3 mt-3 sm:flex-row sm:justify-end">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting || loading}
            className="gap-2 flex-1 sm:flex-none"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Button>
          <Button
            onClick={handleCreateBudget}
            disabled={isSubmitting || loading || !selectedTemplateId || !isIncomeValid}
            className="gap-2 flex-1 sm:flex-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('creating')}
              </>
            ) : (
              <>
                {t('createBudget')}
                <Check className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
