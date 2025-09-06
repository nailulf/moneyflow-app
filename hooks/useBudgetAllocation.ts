import { useState, useCallback, useMemo } from 'react'
import {
  BudgetAllocationState,
  BudgetCategoryAllocation,
  AllocationValidationResult,
  initializeBudgetAllocation,
  addCategoryAllocation,
  updateCategoryAllocation,
  removeCategoryAllocation,
  updateTotalBudgetAmount,
  validateBudgetAllocation,
  getCompleteBudgetAllocation,
  fromExistingBudgetData,
  toDatabase,
  OTHERS_CATEGORY
} from '@/lib/budget-allocation'
import { toast } from 'sonner'

// Hook return type
export interface UseBudgetAllocationReturn {
  // State
  allocationState: BudgetAllocationState
  validation: AllocationValidationResult
  isValid: boolean
  
  // Computed values
  totalAllocated: number
  remainingAmount: number
  allocatedCategories: BudgetCategoryAllocation[]
  completeAllocation: BudgetCategoryAllocation[]
  
  // Actions
  initializeAllocation: (totalAmount: number, currency?: string) => void
  loadFromExistingBudget: (totalAmount: number, categories: Array<{
    category_id: string
    category_name: string
    category_color: string
    allocated_amount: number
    spent_amount?: number
  }>, currency?: string) => void
  addCategory: (categoryId: string, categoryName: string, categoryColor: string, amount: number) => boolean
  updateCategory: (categoryId: string, newAmount: number) => boolean
  removeCategory: (categoryId: string) => boolean
  updateTotalAmount: (newTotal: number) => boolean
  resetAllocation: () => void
  
  // Utility functions
  canAddCategory: (categoryId: string, amount: number) => { canAdd: boolean; reason?: string }
  canUpdateCategory: (categoryId: string, newAmount: number) => { canUpdate: boolean; reason?: string }
  getCategoryAllocation: (categoryId: string) => BudgetCategoryAllocation | null
  hasCategory: (categoryId: string) => boolean
  
  // Export functions
  toDatabaseFormat: () => Array<{ category_id: string; allocated_amount: number }>
}

/**
 * Custom hook for managing budget allocation with automatic balancing
 */
export function useBudgetAllocation(initialTotal: number = 0, initialCurrency: string = 'USD'): UseBudgetAllocationReturn {
  const [allocationState, setAllocationState] = useState<BudgetAllocationState>(() => 
    initializeBudgetAllocation(initialTotal, initialCurrency)
  )

  // Validation
  const validation = useMemo(() => validateBudgetAllocation(allocationState), [allocationState])
  const isValid = validation.isValid

  // Optimized computed values with better memoization
  const totalAllocated = useMemo(() => 
    allocationState.categories.reduce((sum, cat) => sum + cat.allocated_amount, 0),
    [allocationState.categories]
  )

  // Simplified: no need to memoize primitive values
  const remainingAmount = allocationState.othersAmount
  
  // Simplified: no need to memoize direct references
  const allocatedCategories = allocationState.categories
  
  const completeAllocation = useMemo(() => getCompleteBudgetAllocation(allocationState), [allocationState])

  // Initialize allocation
  const initializeAllocation = useCallback((totalAmount: number, currency: string = 'USD') => {
    try {
      const newState = initializeBudgetAllocation(totalAmount, currency)
      setAllocationState(newState)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initialize allocation')
    }
  }, [])

  // Load from existing budget data
  const loadFromExistingBudget = useCallback((totalAmount: number, categories: Array<{
    category_id: string
    category_name: string
    category_color: string
    allocated_amount: number
    spent_amount?: number
  }>, currency: string = 'USD') => {
    try {
      const newState = fromExistingBudgetData(totalAmount, categories, currency)
      setAllocationState(newState)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load budget data')
    }
  }, [])

  // Add category
  const addCategory = useCallback((categoryId: string, categoryName: string, categoryColor: string, amount: number): boolean => {
    try {
      const newState = addCategoryAllocation(allocationState, categoryId, categoryName, categoryColor, amount)
      setAllocationState(newState)
      toast.success(`Added ${categoryName} with ${amount} allocation`)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add category')
      return false
    }
  }, [allocationState])

  // Update category
  const updateCategory = useCallback((categoryId: string, newAmount: number): boolean => {
    try {
      const newState = updateCategoryAllocation(allocationState, categoryId, newAmount)
      setAllocationState(newState)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update category')
      return false
    }
  }, [allocationState])

  // Remove category
  const removeCategory = useCallback((categoryId: string): boolean => {
    try {
      const category = allocationState.categories.find(cat => cat.category_id === categoryId)
      const newState = removeCategoryAllocation(allocationState, categoryId)
      setAllocationState(newState)
      
      if (category) {
        toast.success(`Removed ${category.category_name} and returned ${category.allocated_amount} to Others`)
      }
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove category')
      return false
    }
  }, [allocationState])

  // Update total amount
  const updateTotalAmount = useCallback((newTotal: number): boolean => {
    try {
      const newState = updateTotalBudgetAmount(allocationState, newTotal)
      setAllocationState(newState)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update total amount')
      return false
    }
  }, [allocationState])

  // Reset allocation
  const resetAllocation = useCallback(() => {
    const newState = initializeBudgetAllocation(allocationState.totalAmount, allocationState.currency)
    setAllocationState(newState)
    toast.success('Reset all allocations')
  }, [allocationState.totalAmount, allocationState.currency])

  // Check if category can be added
  const canAddCategory = useCallback((categoryId: string, amount: number): { canAdd: boolean; reason?: string } => {
    if (amount < 0) {
      return { canAdd: false, reason: 'Amount cannot be negative' }
    }
    
    if (amount > allocationState.othersAmount) {
      return { 
        canAdd: false, 
        reason: `Insufficient funds. Available: ${allocationState.othersAmount}, Requested: ${amount}` 
      }
    }
    
    if (allocationState.categories.some(cat => cat.category_id === categoryId)) {
      return { canAdd: false, reason: 'Category already exists' }
    }
    
    return { canAdd: true }
  }, [allocationState])

  // Check if category can be updated
  const canUpdateCategory = useCallback((categoryId: string, newAmount: number): { canUpdate: boolean; reason?: string } => {
    if (newAmount < 0) {
      return { canUpdate: false, reason: 'Amount cannot be negative' }
    }
    
    const category = allocationState.categories.find(cat => cat.category_id === categoryId)
    if (!category) {
      return { canUpdate: false, reason: 'Category not found' }
    }
    
    const difference = newAmount - category.allocated_amount
    if (difference > allocationState.othersAmount) {
      return { 
        canUpdate: false, 
        reason: `Insufficient funds. Available: ${allocationState.othersAmount}, Additional needed: ${difference}` 
      }
    }
    
    return { canUpdate: true }
  }, [allocationState])

  // Get category allocation
  const getCategoryAllocation = useCallback((categoryId: string): BudgetCategoryAllocation | null => {
    return allocationState.categories.find(cat => cat.category_id === categoryId) || null
  }, [allocationState.categories])

  // Check if category exists
  const hasCategory = useCallback((categoryId: string): boolean => {
    return allocationState.categories.some(cat => cat.category_id === categoryId)
  }, [allocationState.categories])

  // Convert to database format
  const toDatabaseFormat = useCallback(() => {
    return toDatabase(allocationState)
  }, [allocationState])

  return {
    // State
    allocationState,
    validation,
    isValid,
    
    // Computed values
    totalAllocated,
    remainingAmount,
    allocatedCategories,
    completeAllocation,
    
    // Actions
    initializeAllocation,
    loadFromExistingBudget,
    addCategory,
    updateCategory,
    removeCategory,
    updateTotalAmount,
    resetAllocation,
    
    // Utility functions
    canAddCategory,
    canUpdateCategory,
    getCategoryAllocation,
    hasCategory,
    
    // Export functions
    toDatabaseFormat
  }
}

/**
 * Hook for read-only budget allocation display
 */
export function useBudgetAllocationDisplay(budgetData: {
  totalAmount: number
  categories: Array<{
    category_id: string
    category_name: string
    category_color: string
    allocated_amount: number
    spent_amount?: number
  }>
  currency?: string
}) {
  const allocationState = useMemo(() => 
    fromExistingBudgetData(budgetData.totalAmount, budgetData.categories, budgetData.currency),
    [budgetData]
  )
  
  const validation = useMemo(() => validateBudgetAllocation(allocationState), [allocationState])
  const completeAllocation = useMemo(() => getCompleteBudgetAllocation(allocationState), [allocationState])
  
  const totalAllocated = useMemo(() => 
    allocationState.categories.reduce((sum, cat) => sum + cat.allocated_amount, 0),
    [allocationState.categories]
  )
  
  // Optimized: only memoize when computation is expensive
  const othersCategory = useMemo(() => {
    if (allocationState.othersAmount > 0) {
      return {
        id: `allocation-${OTHERS_CATEGORY.id}`,
        category_id: OTHERS_CATEGORY.id,
        category_name: OTHERS_CATEGORY.name,
        category_color: OTHERS_CATEGORY.color,
        allocated_amount: allocationState.othersAmount,
        spent_amount: 0
      }
    }
    return null
  }, [allocationState.othersAmount])
  
  return {
    allocationState,
    validation,
    isValid: validation.isValid,
    totalAllocated,
    remainingAmount: allocationState.othersAmount,
    allocatedCategories: allocationState.categories,
    completeAllocation,
    othersCategory
  }
}