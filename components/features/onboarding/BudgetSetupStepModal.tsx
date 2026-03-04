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
import {
  ArrowLeft,
  Loader2,
  Check
} from 'lucide-react'
import { DialogFooter } from '@/components/ui/molecules/dialog'

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

  const allocations = calculateAllocations()
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0)
  const income = parseFloat(monthlyIncome) || 0
  const allocationPercentage = income > 0 ? Math.round((totalAllocated / income) * 100) : 0

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

      // Create the budget plan (timeless — no name, year, or month needed)
      const budgetData = {
        userId: user.id,
        total_amount: income,
        period: 'monthly' as const,
        currency: 'IDR',
        categories: Object.entries(allocations).map(([categoryId, amount]) => ({
          category_id: categoryId,
          allocated_amount: amount
        }))
      }

      // Create budget plan via API (also auto-creates snapshot for current period)
      const response = await fetch('/api/budget-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData)
      })

      if (!response.ok) {
        throw new Error('Failed to create budget')
      }

      await goToPhase('completed')
    } catch (error) {
      console.error('Error creating budget:', error)
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
    <div className="space-y-4">
      {/* Monthly Income */}
      <div className="space-y-2">
        <Label htmlFor="income">{t('monthlyIncomeLabel')}</Label>
        <Input
          id="income"
          type="amount"
          placeholder={t('incomePlaceholder')}
          value={monthlyIncome}
          onChange={(e) => setMonthlyIncome(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {/* Budget Templates */}
      <div className="space-y-2">
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('needs')}: {templateAllocations.needs}% | {t('wants')}: {templateAllocations.wants}% | {t('savings')}: {templateAllocations.savings}%
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Allocation Preview */}
      {selectedTemplateId && income > 0 && (
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>{t('budgetPreview')}</span>
            <span className="font-medium">
              Rp {totalAllocated.toLocaleString('id-ID')}
            </span>
          </div>
          <Progress value={allocationPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {t('incomeAllocated', { percent: allocationPercentage })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {t('editNote')}
      </p>

      <DialogFooter>
      {/* Actions */}
      <div className="flex gap-3 justify-between pt-2">
        <Button
          variant="ghost"
          onClick={handleSkipBudget}
          disabled={isSubmitting || loading}
          size="sm"
        >
          {t('skipBudget')}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting || loading}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Button>
          <Button
            onClick={handleCreateBudget}
            disabled={isSubmitting || loading || !selectedTemplateId || !monthlyIncome}
            className="gap-2"
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
      </DialogFooter>
    </div>
  )
}
