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
  AlertCircle,
} from 'lucide-react'

export function BudgetSetupStepModal() {
  const t = useTranslations('onboarding.budgetSetup')
  const { user } = useAuth()
  const { prevPhase, setWizardData, goToPhase, loading, isPreviewMode } = useOnboarding()
  const { categories } = useCategories()
  const { data: templates, isLoading: templatesLoading } = useBudgetTemplates()

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId)

  const calculateAllocations = () => {
    if (!selectedTemplate || !monthlyIncome) return {}

    const income = parseFloat(monthlyIncome) || 0
    const allocations: Record<string, number> = {}

    const templateAllocations = selectedTemplate.allocations as { needs: number; wants: number; savings: number }
    const categoryMappings = selectedTemplate.category_mappings as Record<string, string[]>

    Object.entries(categoryMappings).forEach(([key, categoryNames]) => {
      const percentage = templateAllocations[key as keyof typeof templateAllocations] || 0
      const totalForGroup = (income * percentage) / 100
      const perCategory = totalForGroup / categoryNames.length

      categoryNames.forEach(name => {
        const category = categories.find(c => c.name === name)
        if (category) {
          allocations[category.id] = Math.round(perCategory)
        }
      })
    })

    return allocations
  }

  // Build per-group preview data for display
  const getGroupBreakdown = () => {
    if (!selectedTemplate || !monthlyIncome) return []
    const income = parseFloat(monthlyIncome) || 0
    const templateAllocations = selectedTemplate.allocations as { needs: number; wants: number; savings: number }
    const categoryMappings = selectedTemplate.category_mappings as Record<string, string[]>

    return Object.entries(categoryMappings).map(([key, categoryNames]) => {
      const percentage = templateAllocations[key as keyof typeof templateAllocations] || 0
      const groupTotal = Math.round((income * percentage) / 100)
      const perCategory = categoryNames.length > 0 ? Math.round(groupTotal / categoryNames.length) : 0

      const matched = categoryNames.map(name => ({
        name,
        category: categories.find(c => c.name === name),
      }))

      return { key, percentage, groupTotal, perCategory, matched }
    })
  }

  const allocations = calculateAllocations()
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0)
  const income = parseFloat(monthlyIncome) || 0
  const allocationPercentage = income > 0 ? Math.round((totalAllocated / income) * 100) : 0
  const groupBreakdown = getGroupBreakdown()
  const hasUnmatched = groupBreakdown.some(g => g.matched.some(m => !m.category))

  const handleCreateBudget = async () => {
    if (!user?.id) return

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

  const handleSkipBudget = async () => {
    await goToPhase('completed')
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
    <div className="flex flex-col gap-4">
      {/* Monthly Income */}
      <div className="space-y-1.5">
        <Label htmlFor="income">{t('monthlyIncomeLabel')}</Label>
        <Input
          id="income"
          type="number"
          inputMode="numeric"
          placeholder={t('incomePlaceholder')}
          value={monthlyIncome}
          onChange={(e) => setMonthlyIncome(e.target.value)}
          disabled={isSubmitting}
          className="h-11"
        />
      </div>

      {/* Budget Templates */}
      <div className="space-y-1.5">
        <Label>{t('chooseBudgetTemplate')}</Label>
        <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
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
            {groupBreakdown.map(({ key, percentage, groupTotal, perCategory, matched }) => (
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
                  {matched.map(({ name, category }) => (
                    <div
                      key={name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {category ? (
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                        ) : (
                          <AlertCircle className="h-2.5 w-2.5 shrink-0 text-amber-500" />
                        )}
                        <span className={cn('truncate text-muted-foreground', !category && 'line-through')}>
                          {name}
                        </span>
                      </div>
                      {category && (
                        <span className="text-muted-foreground shrink-0 pl-2">
                          Rp {perCategory.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {hasUnmatched && (
            <p className="text-xs text-amber-600 flex items-center gap-1 pt-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Some categories weren&apos;t found and will be skipped
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {t('editNote')}
      </p>

      {/* Actions — stacks vertically on mobile, row on sm+ */}
      <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-between">
        <Button
          variant="ghost"
          onClick={handleSkipBudget}
          disabled={isSubmitting || loading}
          size="sm"
          className="w-full sm:w-auto"
        >
          {t('skipBudget')}
        </Button>

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
            disabled={isSubmitting || loading || !selectedTemplateId || !monthlyIncome}
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
