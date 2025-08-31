'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { getUserBudgets, createBudget, updateBudget, deleteBudget, getBudgetItems } from '@/lib/api/budgets'
import { BudgetDB, BudgetInsert, BudgetUpdate } from '@/types/database'
import { toast } from 'sonner'

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
  getBudgetItems: (budgetId: string) => Promise<any[]>
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

interface BudgetProviderProps {
  children: ReactNode
  userId: string
  autoFetch?: boolean
  year?: number
  month?: number
}

export function BudgetProvider({ 
  children, 
  userId, 
  autoFetch = true,
  year,
  month 
}: BudgetProviderProps) {
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
      color: bc.category?.color || '#6B7280',
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
    try {
      setLoading(true)
      setError(null)
      
      await deleteBudget(budgetId)
      
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
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [selectedBudget])

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
    getBudgetItems: getBudgetItemsHandler
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