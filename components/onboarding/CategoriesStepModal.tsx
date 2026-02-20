'use client'

import { useState } from 'react'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useCategories } from '@/contexts/CategoryContext'
import { Button } from '@/components/ui/atoms/button'
import { Badge } from '@/components/ui/atoms/badge'
import { Input } from '@/components/ui/atoms/input'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Pencil,
  Check,
  X
} from 'lucide-react'
import { CategoryDB } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { useAutoRefresh } from '@/hooks/useDataRefresh'

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

function getIconForCategory(name: string, groupType: string): string {
  // Check exact match first
  if (CATEGORY_ICONS[name]) {
    return CATEGORY_ICONS[name]
  }
  // Default icons by group type
  switch (groupType) {
    case 'EXPENSE':
      return '📋'
    case 'INCOME':
      return '💵'
    case 'TRANSFER':
      return '🔄'
    default:
      return '📋'
  }
}

interface EditableCategoryProps {
  category: CategoryDB
  onSave: (id: string, newName: string) => Promise<void>
  isUpdating: boolean
}

function EditableCategory({ category, onSave, isUpdating }: EditableCategoryProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(category.name)

  const handleSave = async () => {
    if (editValue.trim() && editValue !== category.name) {
      await onSave(category.id, editValue.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(category.name)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
        <span>{getIconForCategory(category.name, category.group_type)}</span>
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm flex-1"
          autoFocus
          disabled={isUpdating}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleSave}
          disabled={isUpdating || !editValue.trim()}
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3 text-green-600" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleCancel}
          disabled={isUpdating}
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm group cursor-pointer hover:bg-muted"
      onClick={() => setIsEditing(true)}
    >
      <span>{getIconForCategory(category.name, category.group_type)}</span>
      <span className="truncate flex-1">{category.name}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

export function CategoriesStepModal() {
  const { user } = useAuth()
  const { nextPhase, prevPhase, loading } = useOnboarding()
  const { categories, loading: categoriesLoading, refreshCategories } = useCategories()
  const { onCategoryChange } = useAutoRefresh(user?.id)
  const [isUpdating, setIsUpdating] = useState(false)

  const expenseCategories = categories.filter(c => c.group_type === 'EXPENSE')
  const incomeCategories = categories.filter(c => c.group_type === 'INCOME')
  const transferCategories = categories.filter(c => c.group_type === 'TRANSFER')

  const handleUpdateCategory = async (categoryId: string, newName: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: categoryId,
          name: newName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update category')
      }

      await refreshCategories()
      onCategoryChange() // Refresh related data across the app
    } catch (error) {
      console.error('Failed to update category:', error)
    } finally {
      setIsUpdating(false)
    }
  }

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
            <EditableCategory
              key={category.id}
              category={category}
              onSave={handleUpdateCategory}
              isUpdating={isUpdating}
            />
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
            <EditableCategory
              key={category.id}
              category={category}
              onSave={handleUpdateCategory}
              isUpdating={isUpdating}
            />
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
            <EditableCategory
              key={category.id}
              category={category}
              onSave={handleUpdateCategory}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Click on any category to rename it. You can also manage categories anytime from Settings.
      </p>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={loading || isUpdating}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={loading || isUpdating}
          className="gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
