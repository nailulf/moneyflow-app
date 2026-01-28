'use client'

import { useOnboarding } from '@/contexts/OnboardingContext'
import { useCategories } from '@/contexts/CategoryContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  ArrowRight,
  Loader2
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, string> = {
  'Food & Dining': '🍕',
  'Transportation': '🚗',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Bills & Utilities': '💡',
  'Healthcare': '🏥',
  'Education': '🎓',
  'Travel': '✈️',
  'Other': '📦',
  'Income': '💰',
  'Transfer': '🔄',
  'Savings transfer': '🏦',
  'Credit card payment': '💳'
}

export function CategoriesStepModal() {
  const { nextPhase, prevPhase, loading } = useOnboarding()
  const { categories, loading: categoriesLoading } = useCategories()

  const expenseCategories = categories.filter(c => c.group_type === 'EXPENSE')
  const incomeCategories = categories.filter(c => c.group_type === 'INCOME')
  const transferCategories = categories.filter(c => c.group_type === 'TRANSFER')

  const handleContinue = async () => {
    await nextPhase()
  }

  const handleBack = async () => {
    await prevPhase()
  }

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Expense Categories */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs">Expense</Badge>
          <span className="text-sm text-muted-foreground">Categories for spending</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {expenseCategories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm"
            >
              <span>{CATEGORY_ICONS[category.name] || '📋'}</span>
              <span className="truncate">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Income Categories */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500 text-xs">Income</Badge>
          <span className="text-sm text-muted-foreground">Categories for earnings</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {incomeCategories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm"
            >
              <span>{CATEGORY_ICONS[category.name] || '💵'}</span>
              <span className="truncate">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Categories */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Transfer</Badge>
          <span className="text-sm text-muted-foreground">Categories for moving money</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {transferCategories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm"
            >
              <span>{CATEGORY_ICONS[category.name] || '🔄'}</span>
              <span className="truncate">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        You can customize these categories anytime from Settings
      </p>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={loading}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={loading}
          className="gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
