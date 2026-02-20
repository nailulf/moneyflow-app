'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useCategories } from '@/contexts/CategoryContext'
import { useBudgetTemplates } from '@/hooks/useOnboardingQuery'
import { useAuth } from '@/contexts/AuthContext'
import { EducationalCard } from './EducationalCard'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/molecules/card'
import { Progress } from '@/components/ui/atoms/progress'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check
} from 'lucide-react'

export function BudgetSetupStep() {
  const router = useRouter()
  const { user } = useAuth()
  const { prevPhase, setWizardData, complete } = useOnboarding()
  const { categories } = useCategories()
  const { data: templates, isLoading: templatesLoading } = useBudgetTemplates()

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get expense categories for allocation preview
  const expenseCategories = categories.filter(c => c.group_type === 'EXPENSE')

  // Get selected template
  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId)

  // Calculate allocations based on template and income
  const calculateAllocations = () => {
    if (!selectedTemplate || !monthlyIncome) return {}

    const income = parseFloat(monthlyIncome) || 0
    const allocations: Record<string, number> = {}

    // Use template allocations and map to categories
    const templateAllocations = selectedTemplate.allocations as { needs: number; wants: number; savings: number }
    const categoryMappings = selectedTemplate.category_mappings as Record<string, string[]>

    // Calculate amounts per category
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
  const remaining = income - totalAllocated
  const allocationPercentage = income > 0 ? Math.round((totalAllocated / income) * 100) : 0

  const handleCreateBudget = async () => {
    if (!user?.id) return

    setIsSubmitting(true)

    try {
      // Store budget data in wizard
      setWizardData({
        budget: {
          templateId: selectedTemplateId,
          monthlyIncome: income,
          allocations
        }
      })

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

      // Navigate to completion
      router.push('/complete')
    } catch (error) {
      console.error('Error creating budget:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipBudget = async () => {
    // Skip budget creation and complete onboarding
    router.push('/complete')
  }

  const handleBack = async () => {
    await prevPhase()
  }

  if (templatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Set Your First Budget</h2>
        <p className="mt-2 text-gray-600">
          Optional but recommended to track your spending
        </p>
      </div>

      {/* Educational Card */}
      <EducationalCard
        title="What is a budget?"
        description="A budget is your spending plan. Set limits for each category, track progress throughout the month, and get alerts when you're overspending. Don't worry - you can always adjust it later!"
      />

      {/* Monthly Income */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Income</CardTitle>
          <CardDescription>
            Enter your monthly income to calculate budget allocations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="income">Monthly Income (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                Rp
              </span>
              <Input
                id="income"
                type="number"
                placeholder="e.g., 10000000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="pl-10"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Choose a Budget Template</CardTitle>
          <CardDescription>
            Select a template to quickly set up your budget allocations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
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
                    'w-full text-left p-4 rounded-lg border-2 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Needs: {templateAllocations.needs}% | Wants: {templateAllocations.wants}% | Savings: {templateAllocations.savings}%
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Allocation Preview */}
      {selectedTemplateId && income > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Budget Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Allocated</span>
                <span className="font-medium">
                  Rp {totalAllocated.toLocaleString('id-ID')} / Rp {income.toLocaleString('id-ID')}
                </span>
              </div>
              <Progress value={allocationPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{allocationPercentage}% allocated</span>
                <span>Rp {remaining.toLocaleString('id-ID')} remaining</span>
              </div>
            </div>

            {/* Category allocations */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(allocations).map(([categoryId, amount]) => {
                const category = categories.find(c => c.id === categoryId)
                if (!category || amount === 0) return null

                return (
                  <div
                    key={categoryId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{category.name}</span>
                    <span className="font-medium">
                      Rp {amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
        <Button
          variant="ghost"
          onClick={handleSkipBudget}
          disabled={isSubmitting}
        >
          Skip budget setup
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleCreateBudget}
            disabled={isSubmitting || !selectedTemplateId || !monthlyIncome}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Budget
                <Check className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Skip note */}
      <p className="text-sm text-center text-muted-foreground">
        You can create or edit budgets anytime from your dashboard
      </p>
    </div>
  )
}
