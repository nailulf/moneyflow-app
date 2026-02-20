'use client'

import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useCategories } from '@/contexts/CategoryContext'
import { EducationalCard } from './EducationalCard'
import { Button } from '@/components/ui/atoms/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import { Badge } from '@/components/ui/atoms/badge'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Settings
} from 'lucide-react'

// Category icons mapping based on name
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

export function CategoriesStep() {
  const router = useRouter()
  const { nextPhase, prevPhase, skip } = useOnboarding()
  const { categories, loading } = useCategories()

  // Group categories by type
  const expenseCategories = categories.filter(c => c.group_type === 'EXPENSE')
  const incomeCategories = categories.filter(c => c.group_type === 'INCOME')
  const transferCategories = categories.filter(c => c.group_type === 'TRANSFER')

  const handleContinue = async () => {
    await nextPhase()
  }

  const handleBack = async () => {
    await prevPhase()
  }

  const handleSkipOnboarding = async () => {
    await skip('Skipped from categories step')
    router.push('/')
  }

  const handleCustomize = () => {
    // Open category manager or navigate to settings
    router.push('/settings/categories')
  }

  if (loading) {
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
        <h2 className="text-2xl font-bold text-gray-900">Your Expense Categories</h2>
        <p className="mt-2 text-gray-600">
          We&apos;ve set up default categories for you
        </p>
      </div>

      {/* Educational Card */}
      <EducationalCard
        title="Why categories matter?"
        description="Categories help you understand your spending patterns. How much do you spend on food? Are entertainment costs too high? Where can you cut back? Categorizing your transactions makes these insights possible."
      />

      {/* Categories Display */}
      <div className="space-y-4">
        {/* Expense Categories */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">Expense</Badge>
                Categories for spending
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {expenseCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                >
                  <span className="text-lg">
                    {CATEGORY_ICONS[category.name] || '📋'}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {category.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Income Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className="bg-green-500 text-xs">Income</Badge>
              Categories for earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {incomeCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                >
                  <span className="text-lg">
                    {CATEGORY_ICONS[category.name] || '💵'}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {category.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transfer Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Transfer</Badge>
              Categories for moving money
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {transferCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                >
                  <span className="text-lg">
                    {CATEGORY_ICONS[category.name] || '🔄'}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {category.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customize note */}
      <p className="text-sm text-center text-muted-foreground">
        You can customize these categories anytime from Settings
      </p>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
        <Button
          variant="ghost"
          onClick={handleSkipOnboarding}
        >
          Skip setup entirely
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleContinue}
            className="gap-2"
          >
            Continue with defaults
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
