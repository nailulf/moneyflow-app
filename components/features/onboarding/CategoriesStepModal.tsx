'use client'

import { createElement, useState } from 'react'
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
  X,
  Trash2,
  Plus,
} from 'lucide-react'
import { CategoryDB } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { useAutoRefresh } from '@/hooks/useDataRefresh'
import { invalidateCategoriesCache } from '@/lib/api/categories'
import { getCategoryIcon } from '@/lib/category-style'
import { cn } from '@/lib/utils'

// getCategoryIcon returns static module-level components, but aliasing one
// into JSX (`const Icon = ...; <Icon />`) trips `react-hooks/static-components`
// — the linter can't see through the lookup. createElement sidesteps the alias.
function CategoryIcon({ name, className }: { name: string, className?: string }) {
  return createElement(getCategoryIcon(name), { className })
}

interface AddCategoryTileProps {
  groupType: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  categoryGroupId: string | null
  onAdd: (name: string, groupType: 'EXPENSE' | 'INCOME' | 'TRANSFER', categoryGroupId: string | null) => Promise<void>
  isBusy: boolean
}

function AddCategoryTile({ groupType, categoryGroupId, onAdd, isBusy }: AddCategoryTileProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState('')

  const handleConfirm = async () => {
    if (!value.trim()) {
      setIsAdding(false)
      return
    }
    await onAdd(value.trim(), groupType, categoryGroupId)
    setValue('')
    setIsAdding(false)
  }

  const handleCancel = () => {
    setValue('')
    setIsAdding(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isAdding) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md border-2 border-dashed border-primary/50 bg-primary/5 text-sm">
        <Plus className="h-4 w-4 shrink-0 text-primary" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Category name"
          className="h-7 text-sm flex-1"
          autoFocus
          disabled={isBusy}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleConfirm}
          disabled={isBusy || !value.trim()}
          aria-label="Save"
        >
          {isBusy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3 text-success" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleCancel}
          disabled={isBusy}
          aria-label="Cancel"
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setIsAdding(true)}
      disabled={isBusy}
      className={cn(
        'flex items-center justify-center gap-1.5 p-2 rounded-md border-2 border-dashed border-border text-sm text-muted-foreground transition-colors',
        'hover:border-primary/60 hover:text-primary hover:bg-primary/5',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      <Plus className="h-3.5 w-3.5" />
      <span>Add new</span>
    </button>
  )
}

interface EditableCategoryProps {
  category: CategoryDB
  onSave: (id: string, newName: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isBusy: boolean
  disableDelete: boolean
}

function EditableCategory({ category, onSave, onDelete, isBusy, disableDelete }: EditableCategoryProps) {
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
        <CategoryIcon name={category.name} className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm flex-1"
          autoFocus
          disabled={isBusy}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleSave}
          disabled={isBusy || !editValue.trim()}
          aria-label="Save"
        >
          {isBusy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3 text-success" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleCancel}
          disabled={isBusy}
          aria-label="Cancel"
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm hover:bg-muted transition-colors">
      <CategoryIcon name={category.name} className="h-4 w-4 shrink-0 text-muted-foreground" />
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="flex-1 text-left truncate hover:underline"
      >
        {category.name}
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        disabled={isBusy}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Rename category"
        title="Rename"
      >
        <Pencil className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(category.id)}
        disabled={isBusy || disableDelete}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded',
          'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
          (isBusy || disableDelete) && 'cursor-not-allowed opacity-30 hover:bg-transparent hover:text-muted-foreground'
        )}
        aria-label="Remove category"
        title={disableDelete ? 'At least one category must remain in this group' : 'Remove'}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}

export function CategoriesStepModal() {
  const { user } = useAuth()
  const { nextPhase, prevPhase, loading } = useOnboarding()
  const { categories, loading: categoriesLoading, refreshCategories } = useCategories()
  const { onCategoryChange } = useAutoRefresh(user?.id)
  const [isBusy, setIsBusy] = useState(false)
  // Track which category id is in-flight so we can fade it out optimistically
  // and avoid the "deleted but still visible" limbo while the refetch lands.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const visibleCategories = categories.filter(c => c.id !== pendingDeleteId)
  const expenseCategories = visibleCategories.filter(c => c.group_type === 'EXPENSE')
  const incomeCategories = visibleCategories.filter(c => c.group_type === 'INCOME')
  const transferCategories = visibleCategories.filter(c => c.group_type === 'TRANSFER')

  const handleUpdateCategory = async (categoryId: string, newName: string) => {
    setIsBusy(true)
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
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to update category')
      }

      // Drop the in-memory cache in lib/api/categories.ts before refetching;
      // React Query alone won't bust it.
      invalidateCategoriesCache(user?.id)
      await refreshCategories()
      onCategoryChange()
    } catch (error) {
      console.error('Failed to update category:', error)
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    // Optimistic remove: hide the row immediately so the user sees instant
    // feedback. We restore it on error.
    setPendingDeleteId(categoryId)
    setIsBusy(true)
    try {
      // The route reads `category_id` from query params (see app/api/categories/route.ts:200).
      const response = await fetch(`/api/categories?category_id=${categoryId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete category')
      }
      // Bust the lib/api in-memory cache, then ask React Query to refetch the
      // authoritative list. Without the cache bust the refetch returns stale
      // data and the deleted row reappears.
      invalidateCategoriesCache(user?.id)
      await refreshCategories()
      onCategoryChange()
    } catch (error) {
      console.error('Failed to delete category:', error)
      // Restore the row so the user can retry instead of being left in limbo.
      setPendingDeleteId(null)
    } finally {
      setIsBusy(false)
      // Clear the optimistic marker after the refetch lands. If the refetch
      // succeeded the category is gone from `categories` already; if not,
      // the early `setPendingDeleteId(null)` above handled it.
      setPendingDeleteId(null)
    }
  }

  const handleAddCategory = async (
    name: string,
    groupType: 'EXPENSE' | 'INCOME' | 'TRANSFER',
    categoryGroupId: string | null
  ) => {
    if (!name.trim()) return
    setIsBusy(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          group_type: groupType,
          category_group_id: categoryGroupId,
          is_custom: true,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to add category')
      }
      invalidateCategoriesCache(user?.id)
      await refreshCategories()
      onCategoryChange()
    } catch (error) {
      console.error('Failed to add category:', error)
    } finally {
      setIsBusy(false)
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

  // Guard: never let the user delete the last category in a group. Keeping
  // at least one per group ensures the app still works downstream (budgets,
  // transaction form default pickers, etc.).
  const renderGroup = (
    list: CategoryDB[],
    label: string,
    subtitle: string,
    badgeClass: string,
    groupType: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  ) => {
    // Derive the parent category_group_id from any existing category in the
    // group. Falls back to null if the group is empty (extremely unlikely
    // since we soft-delete and seed at least one row per group).
    const categoryGroupId = list[0]?.category_group_id ?? null
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={badgeClass}>{label}</Badge>
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {list.map((category) => (
            <EditableCategory
              key={category.id}
              category={category}
              onSave={handleUpdateCategory}
              onDelete={handleDeleteCategory}
              isBusy={isBusy}
              disableDelete={list.length <= 1}
            />
          ))}
          <AddCategoryTile
            groupType={groupType}
            categoryGroupId={categoryGroupId}
            onAdd={handleAddCategory}
            isBusy={isBusy}
          />
        </div>
      </div>
    )
  }

  return (
    // Flex column owning its own scrollable body + pinned footer so CTAs
    // always sit at the bottom of the dialog.
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {renderGroup(expenseCategories, 'Expense', 'Categories for spending', 'bg-destructive text-destructive-foreground text-xs', 'EXPENSE')}
        {renderGroup(incomeCategories, 'Income', 'Categories for earnings', 'bg-success text-success-foreground text-xs', 'INCOME')}
        {renderGroup(transferCategories, 'Transfer', 'Categories for moving money', 'bg-secondary text-secondary-foreground text-xs', 'TRANSFER')}

        <p className="text-xs text-muted-foreground text-center">
          Click a category to rename it, or hover for the remove button. You can
          also add new ones from Settings later.
        </p>
      </div>

      {/* Footer — pinned to the bottom of the dialog */}
      <div className="flex gap-3 justify-end pt-3 mt-3 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={loading || isBusy}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={loading || isBusy}
          className="gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
