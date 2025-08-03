'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { CategoryGroupData, CategoryItem, CategoryGroup } from '@/types/app'
import { CategoryDB } from '@/types/database'
import {
  getUserCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  initializeDefaultCategories,
  convertToGroupData,
  convertToInsert
} from '@/lib/api/categories'

interface UseCategoryManagerProps {
  userId: string
  onCategoriesChanged?: (groups: CategoryGroupData[]) => void
}

interface UseCategoryManagerReturn {
  categoryGroups: CategoryGroupData[]
  isLoading: boolean
  error: string | null
  addCategory: (name: string, color: string, group: CategoryGroup) => Promise<void>
  editCategory: (id: string, name: string, color: string) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  refreshCategories: () => Promise<void>
  initializeDefaults: () => Promise<void>
}

export function useCategoryManager({
  userId,
  onCategoriesChanged
}: UseCategoryManagerProps): UseCategoryManagerReturn {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroupData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load categories from database
  const loadCategories = useCallback(async () => {
    if (!userId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const categories = await getUserCategories(userId)
      const groupData = convertToGroupData(categories)
      setCategoryGroups(groupData)
      onCategoriesChanged?.(groupData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load categories'
      setError(errorMessage)
      console.error('Error loading categories:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, onCategoriesChanged])

  // Initialize categories on mount
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Add a new category
  const addCategory = useCallback(async (name: string, color: string, group: CategoryGroup) => {
    if (!userId) {
      toast.error('User not authenticated')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const categoryInsert = convertToInsert(
        { name: name as any, color, group, isCustom: true },
        userId
      )
      
      await createCategory(categoryInsert)
      await loadCategories() // Refresh the list
      toast.success('Category added successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add category'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId, loadCategories])

  // Edit an existing category
  const editCategory = useCallback(async (id: string, name: string, color: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      await updateCategory(id, { name, color })
      await loadCategories() // Refresh the list
      toast.success('Category updated successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadCategories])

  // Remove a category
  const removeCategory = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      await deleteCategory(id)
      await loadCategories() // Refresh the list
      toast.success('Category deleted successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadCategories])

  // Initialize default categories for new users
  const initializeDefaults = useCallback(async () => {
    if (!userId) {
      toast.error('User not authenticated')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      await initializeDefaultCategories(userId)
      await loadCategories() // Refresh the list
      toast.success('Default categories initialized!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize default categories'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId, loadCategories])

  // Refresh categories
  const refreshCategories = useCallback(async () => {
    await loadCategories()
  }, [loadCategories])

  return {
    categoryGroups,
    isLoading,
    error,
    addCategory,
    editCategory,
    removeCategory,
    refreshCategories,
    initializeDefaults
  }
}

// Helper hook for getting categories in a simple format
export function useCategories(userId: string) {
  const { categoryGroups, isLoading, error } = useCategoryManager({ userId })
  
  const allCategories = categoryGroups.flatMap(group => group.categories)
  const expenseCategories = categoryGroups.find(g => g.id === 'EXPENSE')?.categories || []
  const incomeCategories = categoryGroups.find(g => g.id === 'INCOME')?.categories || []
  
  return {
    allCategories,
    expenseCategories,
    incomeCategories,
    categoryGroups,
    isLoading,
    error
  }
}