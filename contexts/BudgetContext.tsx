'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { getUserBudgets, createBudget, updateBudget, deleteBudget, getBudgetItems } from '@/lib/api/budgets'
import { createBudgetCategory, getBudgetCategories, updateBudgetCategory, deleteBudgetCategory } from '@/lib/api/budget-categories'
import { BudgetDB, BudgetInsert, BudgetUpdate, BudgetCategoryDB, BudgetCategoryInsert, BudgetCategoryUpdate } from '@/types/database'
import { BudgetItem } from '@/types/app'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Analytics } from '@/lib/analytics/amplitude'

// Budget interfaces for the context
interface BudgetCategory {
  id: string
  allocated_amount: number
  spent_amount: number
  category: {
    id: string
    name: string
    color: string
  }
}

// Use BudgetDB from database types and extend it with budget_categories
interface Budget extends Omit<BudgetDB, 'budget_categories'> {
  budget_categories?: BudgetCategory[]
}

// Transformed budget interface for CashFlowBreakdown component
export interface TransformedBudget {
  id: string
  name: string
  totalAmount: number
  period: 'monthly' | 'yearly'
  categories: {
    id: string
    category: string
    budgetAmount: number
    spentAmount: number
    color: string
    status: 'good' | 'warning' | 'over'
  }[]
}

interface BudgetContextType {
  budgets: Budget[]
  transformedBudgets: TransformedBudget[]
  selectedBudget: Budget | null
  loading: boolean
  error: string | null
  fetchBudgets: (year?: number, month?: number, activeOnly?: boolean) => Promise<void>
  createBudget: (budgetData: BudgetInsert) => Promise<BudgetDB | null>
  updateBudget: (budgetData: BudgetUpdate) => Promise<BudgetDB | null>
  deleteBudget: (budgetId: string) => Promise<void>
  selectBudget: (budget: Budget | null) => void
  refreshBudgets: () => Promise<void>
  getBudgetById: (budgetId: string) => Budget | null
  getBudgetItems: (budgetId: string) => Promise<BudgetItem[]>
  // Budget category management
  getBudgetCategoriesHandler: (budgetId: string) => Promise<BudgetCategoryDB[]>
  createBudgetCategoryHandler: (budgetCategory: BudgetCategoryInsert) => Promise<BudgetCategoryDB>
  updateBudgetCategoryHandler: (budgetCategory: BudgetCategoryUpdate) => Promise<BudgetCategoryDB>
  deleteBudgetCategoryHandler: (budgetCategoryId: string) => Promise<void>
  // Enhanced budget editing
  updateBudgetWithCategories: (budgetId: string, budgetData: Partial<BudgetUpdate>, categories: BudgetCategoryDB[]) => Promise<void>
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

interface BudgetProviderProps {
  children: ReactNode
  autoFetch?: boolean
  year?: number
  month?: number
}

export function BudgetProvider({ 
  children, 
  autoFetch = true,
  year,
  month 
}: BudgetProviderProps) {
  const { user } = useAuth()
  const userId = user?.id || ''
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to calculate budget status
  const calculateBudgetStatus = (spentAmount: number, budgetAmount: number): 'good' | 'warning' | 'over' => {
    const percentage = (spentAmount / budgetAmount) * 100
    if (percentage > 100) return 'over'
    if (percentage > 80) return 'warning'
    return 'good'
  }

  // Transform budgets for CashFlowBreakdown component
  const transformedBudgets: TransformedBudget[] = budgets.map(budget => ({
    id: budget.id,
    name: budget.name,
    totalAmount: budget.total_amount,
    period: budget.period,
    categories: budget.budget_categories?.map(bc => ({
      id: bc.id,
      category: bc.category?.name || 'Unknown',
      budgetAmount: bc.allocated_amount,
      spentAmount: bc.spent_amount,
      color: bc.category?.color || 'hsl(var(--muted-foreground))',
      status: calculateBudgetStatus(bc.spent_amount, bc.allocated_amount)
    })) || []
  }))

  const fetchBudgets = useCallback(async (targetYear?: number, targetMonth?: number, activeOnly: boolean = true) => {
    if (!userId) return
    
    try {
      setLoading(true)
      setError(null)
      
      const currentDate = new Date()
      const queryYear = targetYear || year || currentDate.getFullYear()
      const queryMonth = targetMonth || month || (currentDate.getMonth() + 1)
      
      let url = `/api/budgets?userId=${userId}&year=${queryYear}`
      if (activeOnly) {
        url += '&active=true'
      }
      if (queryMonth) {
        url += `&month=${queryMonth}`
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch budgets: ${response.statusText}`)
      }
      
      const data = await response.json()
      const budgetData = Array.isArray(data) ? data : []
      
      // Fetch budget items for each budget and combine the data
      const budgetsWithItems = await Promise.all(
        budgetData.map(async (budget: Budget) => {
          try {
            const budgetItems = await getBudgetItems(budget.id)
            
            // Transform budget items to budget categories format
            const budget_categories = budgetItems.map((item: any) => ({
              id: item.id,
              allocated_amount: item.allocated_amount,
              spent_amount: item.spent_amount,
              category: {
                id: item.category_id,
                name: item.category_name,
                color: item.category_color
              }
            }))
            
            return {
              ...budget,
              budget_categories
            }
          } catch (err) {
            console.error(`Error fetching budget items for budget ${budget.id}:`, err)
            return {
              ...budget,
              budget_categories: []
            }
          }
        })
      )
      
      setBudgets(budgetsWithItems)
      
      // Auto-select the first active budget if none selected
      if (budgetsWithItems.length > 0 && !selectedBudget) {
        const activeBudget = budgetsWithItems.find((budget: Budget) => budget.is_active) || budgetsWithItems[0]
        setSelectedBudget(activeBudget)
      } else if (budgetsWithItems.length === 0) {
        setSelectedBudget(null)
      }
    } catch (err) {
      console.error('Error loading budgets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load budgets')
      setBudgets([])
      setSelectedBudget(null)
    } finally {
      setLoading(false)
    }
  }, [userId, year, month, selectedBudget])

  const createBudgetHandler = useCallback(async (budgetData: BudgetInsert): Promise<BudgetDB | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const newBudget = await createBudget(budgetData)
      
      // Add to budgets list with budget_categories property
      const budgetWithCategories: Budget = { ...newBudget, budget_categories: [] }
      setBudgets(prev => [budgetWithCategories, ...prev])
      setSelectedBudget(budgetWithCategories)
      
      toast.success('Budget created successfully')
      return newBudget
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create budget'
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateBudgetHandler = useCallback(async (budgetData: BudgetUpdate): Promise<BudgetDB | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const updatedBudget = await updateBudget(budgetData)
      
      // Update budgets list
      setBudgets(prev => prev.map(budget => {
        if (budget.id === budgetData.id) {
          return { ...updatedBudget, budget_categories: budget.budget_categories || [] }
        }
        return budget
      }))
      
      // Update selected budget if it's the one being updated
      if (selectedBudget && selectedBudget.id === budgetData.id) {
        const updatedBudgetWithCategories: Budget = { 
          ...updatedBudget, 
          budget_categories: selectedBudget.budget_categories || [] 
        }
        setSelectedBudget(updatedBudgetWithCategories)
      }
      
      toast.success('Budget updated successfully')
      return updatedBudget
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update budget'
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [selectedBudget])

  const deleteBudgetHandler = useCallback(async (budgetId: string): Promise<void> => {
    const budgetToDelete = budgets.find(b => b.id === budgetId)
    try {
      setLoading(true)
      setError(null)

      await deleteBudget(budgetId)

      // Track budget deletion
      Analytics.track('Budget Deleted', {
        budget_id: budgetId,
        budget_name: budgetToDelete?.name,
        budget_period: budgetToDelete?.period,
        total_amount: budgetToDelete?.total_amount
      })

      // Remove from budgets list
      setBudgets(prev => {
        const filtered = prev.filter(budget => budget.id !== budgetId)

        // Clear selected budget if it's the one being deleted
        if (selectedBudget?.id === budgetId) {
          setSelectedBudget(filtered[0] || null)
        }

        return filtered
      })

      toast.success('Budget deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete budget'
      setError(errorMessage)

      // Track budget deletion failure
      Analytics.track('Budget Deletion Failed', {
        budget_id: budgetId,
        error_message: errorMessage
      })

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [selectedBudget, budgets])

  const selectBudget = useCallback((budget: Budget | null) => {
    setSelectedBudget(budget)
  }, [])

  const refreshBudgets = useCallback(async () => {
    await fetchBudgets()
  }, [fetchBudgets])

  const getBudgetById = useCallback((budgetId: string): Budget | null => {
    return budgets.find(budget => budget.id === budgetId) || null
  }, [budgets])

  const getBudgetItemsHandler = useCallback(async (budgetId: string) => {
    try {
      return await getBudgetItems(budgetId)
    } catch (err) {
      console.error('Error fetching budget items:', err)
      toast.error('Failed to fetch budget items')
      return []
    }
  }, [])

  // Budget category management functions
  const getBudgetCategoriesHandler = useCallback(async (budgetId: string): Promise<BudgetCategoryDB[]> => {
    try {
      setLoading(true)
      const categories = await getBudgetCategories(budgetId)
      return categories
    } catch (error) {
      console.error('Error fetching budget categories:', error)
      setError('Failed to fetch budget categories')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createBudgetCategoryHandler = useCallback(async (budgetCategory: BudgetCategoryInsert): Promise<BudgetCategoryDB> => {
    try {
      setLoading(true)
      const newCategory = await createBudgetCategory(budgetCategory)
      await refreshBudgets() // Refresh to get updated data
      return newCategory
    } catch (error) {
      console.error('Error creating budget category:', error)
      setError('Failed to create budget category')
      throw error
    } finally {
      setLoading(false)
    }
  }, [refreshBudgets])

  const updateBudgetCategoryHandler = useCallback(async (budgetCategory: BudgetCategoryUpdate): Promise<BudgetCategoryDB> => {
    try {
      setLoading(true)
      const updatedCategory = await updateBudgetCategory(budgetCategory)
      await refreshBudgets() // Refresh to get updated data
      return updatedCategory
    } catch (error) {
      console.error('Error updating budget category:', error)
      setError('Failed to update budget category')
      throw error
    } finally {
      setLoading(false)
    }
  }, [refreshBudgets])

  const deleteBudgetCategoryHandler = useCallback(async (budgetCategoryId: string): Promise<void> => {
    try {
      setLoading(true)
      await deleteBudgetCategory(budgetCategoryId)
      await refreshBudgets() // Refresh to get updated data
    } catch (error) {
      console.error('Error deleting budget category:', error)
      setError('Failed to delete budget category')
      throw error
    } finally {
      setLoading(false)
    }
  }, [refreshBudgets])

  // Enhanced budget editing with categories
  const updateBudgetWithCategories = useCallback(async (
    budgetId: string,
    budgetData: Partial<BudgetUpdate>,
    categories: BudgetCategoryDB[]
  ): Promise<void> => {
    try {
      setLoading(true)
      
      // Update budget data if provided
      if (Object.keys(budgetData).length > 0) {
        await updateBudget({ id: budgetId, ...budgetData })
      }

      // Get current categories to compare
      const currentCategories = await getBudgetCategories(budgetId)
      const currentCategoryIds = new Set(currentCategories.map(cat => cat.id))
      const newCategoryIds = new Set(categories.filter(cat => cat.id).map(cat => cat.id))

      // Delete removed categories
      for (const currentCategory of currentCategories) {
        if (!newCategoryIds.has(currentCategory.id)) {
          await deleteBudgetCategory(currentCategory.id)
        }
      }

      // Update or create categories
      for (const category of categories) {
        if (category.id && currentCategoryIds.has(category.id)) {
          // Update existing category
          await updateBudgetCategory({
            id: category.id,
            budget_id: budgetId,
            category_id: category.category_id,
            allocated_amount: category.allocated_amount,
            currency: category.currency
          })
        } else if (!category.id) {
          // Create new category
          await createBudgetCategory({
            budget_id: budgetId,
            category_id: category.category_id,
            allocated_amount: category.allocated_amount,
            currency: category.currency || 'IDR'
          })
        }
      }

      await refreshBudgets() // Refresh to get updated data
    } catch (error) {
      console.error('Error updating budget with categories:', error)
      setError('Failed to update budget with categories')
      throw error
    } finally {
      setLoading(false)
    }
  }, [refreshBudgets])

  useEffect(() => {
    if (autoFetch) {
      fetchBudgets()
    }
  }, [autoFetch, fetchBudgets])

  const value: BudgetContextType = {
    budgets,
    transformedBudgets,
    selectedBudget,
    loading,
    error,
    fetchBudgets,
    createBudget: createBudgetHandler,
    updateBudget: updateBudgetHandler,
    deleteBudget: deleteBudgetHandler,
    selectBudget,
    refreshBudgets,
    getBudgetById,
    getBudgetItems: getBudgetItemsHandler,
    // Budget category management
    getBudgetCategoriesHandler,
    createBudgetCategoryHandler,
    updateBudgetCategoryHandler,
    deleteBudgetCategoryHandler,
    // Enhanced budget editing
    updateBudgetWithCategories
  }

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudgets() {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error('useBudgets must be used within a BudgetProvider')
  }
  return context
}