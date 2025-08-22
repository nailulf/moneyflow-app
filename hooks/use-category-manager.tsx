'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { CategoryGroupData, CategoryItem, CategoryGroup, CategoryGroupType } from '@/types/app'
import { CategoryDB } from '@/types/database'
import {
  getUserCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  convertToInsert
} from '@/lib/api/categories'
import {
  getUserCategoryGroups,
  createCategoryGroup,
  initializeDefaultCategoryGroups,
  convertCategoryGroupsToGroupData,
  convertToGroupInsert
} from '@/lib/api/category-groups'

interface UseCategoryManagerProps {
  userId: string
  onCategoriesChanged?: (groups: CategoryGroupData[]) => void
}

interface UseCategoryManagerReturn {
  categoryGroups: CategoryGroupData[]
  isLoading: boolean
  error: string | null
  isInitializing: boolean
  addCategory: (name: string, color: string, categoryGroupId: string, groupType: CategoryGroupType) => Promise<void>
  editCategory: (id: string, name: string, color: string) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  addCategoryGroup: (name: string, type: CategoryGroupType, color: string) => Promise<void>
  deleteCategoryGroup: (groupId: string) => Promise<void>
  refreshCategories: () => Promise<void>
  initializeDefaults: () => Promise<void>
  clearInitializationState: () => void
}

export function useCategoryManager({
  userId,
  onCategoriesChanged
}: UseCategoryManagerProps): UseCategoryManagerReturn {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroupData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  // Load categories and category groups from database
  const loadCategories = useCallback(async () => {
    if (!userId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const [categoryGroups, categories] = await Promise.all([
        getUserCategoryGroups(userId),
        getUserCategories(userId)
      ])
      const groupData = convertCategoryGroupsToGroupData(categoryGroups, categories)
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
  const addCategory = useCallback(async (name: string, color: string, categoryGroupId: string, groupType: CategoryGroupType) => {
    if (!userId) {
      toast.error('User not authenticated')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const categoryInsert = convertToInsert(
        { name: name as any, color, categoryGroupId, groupType, isCustom: true },
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

  // Add a new category group
  const addCategoryGroup = useCallback(async (name: string, type: CategoryGroupType, color: string) => {
    if (!userId) {
      toast.error('User not authenticated')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const groupInsert = convertToGroupInsert(
        { name, type, color, isDefault: false, isActive: true, sortOrder: categoryGroups.length + 1 },
        userId
      )
      
      await createCategoryGroup(groupInsert)
      await loadCategories() // Refresh the list
      toast.success('Category group added successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add category group'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId, loadCategories, categoryGroups.length])

  // Delete a category group
   const deleteCategoryGroup = useCallback(async (groupId: string) => {
     setIsLoading(true)
     setError(null)
     
     try {
       const { deleteCategoryGroup: deleteCategoryGroupAPI } = await import('@/lib/api/category-groups')
       await deleteCategoryGroupAPI(groupId)
       await loadCategories() // Refresh the list
       toast.success('Category group deleted successfully!')
     } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Failed to delete category group'
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

    // Prevent multiple simultaneous initializations
    if (isInitializing) {
      return
    }

    // Check if initialization is already in progress globally
    const initKey = `category_init_${userId}`
    const completedKey = `category_init_completed_${userId}`
    const isGloballyInitializing = sessionStorage.getItem(initKey)
    const isAlreadyCompleted = sessionStorage.getItem(completedKey)
    
    if (isGloballyInitializing) {
      console.log('Category initialization already in progress globally')
      return
    }
    
    if (isAlreadyCompleted) {
      console.log('Category initialization already completed for this session')
      return
    }

    // Mark as globally initializing
    sessionStorage.setItem(initKey, 'true')
    setIsInitializing(true)
    setIsLoading(true)
    setError(null)
    
    try {
      // First initialize default category groups
      const categoryGroups = await initializeDefaultCategoryGroups(userId)
      // Map category groups to the format expected by initializeDefaultCategories
      const mappedCategoryGroups = categoryGroups.map(group => ({
        id: group.id,
        type: group.type
      }))
      // Then initialize default categories using the created groups
      const { initializeDefaultCategories } = await import('@/lib/api/categories')
      await initializeDefaultCategories(userId, mappedCategoryGroups)
      await loadCategories() // Refresh the list
      // Mark initialization as completed for this session
      const completedKey = `category_init_completed_${userId}`
      sessionStorage.setItem(completedKey, 'true')
      toast.success('Default categories initialized!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize default categories'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
      setIsInitializing(false)
      // Clear global initialization flag
      const initKey = `category_init_${userId}`
      sessionStorage.removeItem(initKey)
    }
  }, [userId, loadCategories, isInitializing])

  // Refresh categories
  const refreshCategories = useCallback(async () => {
    await loadCategories()
  }, [loadCategories])

  // Clear initialization session storage (useful for testing or manual reset)
  const clearInitializationState = useCallback(() => {
    const initKey = `category_init_${userId}`
    const completedKey = `category_init_completed_${userId}`
    sessionStorage.removeItem(initKey)
    sessionStorage.removeItem(completedKey)
  }, [userId])

  return {
    categoryGroups,
    isLoading,
    error,
    isInitializing,
    addCategory,
    editCategory,
    removeCategory,
    addCategoryGroup,
    deleteCategoryGroup,
    refreshCategories,
    initializeDefaults,
    clearInitializationState
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