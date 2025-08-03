'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface BudgetCategory {
  id: string
  category: string
  budgetAmount: number
  spentAmount: number
  color: string
}

interface Budget {
  id: string
  name: string
  totalAmount: number
  period: 'monthly' | 'yearly'
  categories: BudgetCategory[]
}

interface UseBudgetManagerProps {
  initialBudgets?: Budget[]
  onBudgetCreated?: (budget: Budget) => void
  onBudgetUpdated?: (budget: Budget) => void
  onBudgetDeleted?: (budgetId: string) => void
}

interface UseBudgetManagerReturn {
  budgets: Budget[]
  selectedBudget: Budget | null
  createBudget: (budgetData: Omit<Budget, 'id'>) => Promise<void>
  updateBudget: (id: string, budgetData: Partial<Budget>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  selectBudget: (budget: Budget | null) => void
  setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>
  isLoading: boolean
  error: string | null
}

export function useBudgetManager({
  initialBudgets = [],
  onBudgetCreated,
  onBudgetUpdated,
  onBudgetDeleted
}: UseBudgetManagerProps = {}): UseBudgetManagerReturn {
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(
    initialBudgets[0] || null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBudget = useCallback(async (budgetData: Omit<Budget, 'id'>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newBudget: Budget = {
        ...budgetData,
        id: `budget-${crypto.randomUUID()}`
      }
      
      setBudgets(prev => [...prev, newBudget])
      
      // Set as selected if it's the first budget
      if (budgets.length === 0) {
        setSelectedBudget(newBudget)
      }
      
      onBudgetCreated?.(newBudget)
      toast.success('Budget created successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create budget'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [budgets.length, onBudgetCreated])

  const updateBudget = useCallback(async (id: string, budgetData: Partial<Budget>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setBudgets(prev => prev.map(budget => 
        budget.id === id ? { ...budget, ...budgetData } : budget
      ))
      
      // Update selected budget if it's the one being updated
      if (selectedBudget?.id === id) {
        setSelectedBudget(prev => prev ? { ...prev, ...budgetData } : null)
      }
      
      const updatedBudget = budgets.find(b => b.id === id)
      if (updatedBudget) {
        onBudgetUpdated?.({ ...updatedBudget, ...budgetData })
      }
      
      toast.success('Budget updated successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update budget'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [budgets, selectedBudget, onBudgetUpdated])

  const deleteBudget = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setBudgets(prev => prev.filter(budget => budget.id !== id))
      
      // Clear selected budget if it's the one being deleted
      if (selectedBudget?.id === id) {
        const remainingBudgets = budgets.filter(b => b.id !== id)
        setSelectedBudget(remainingBudgets[0] || null)
      }
      
      onBudgetDeleted?.(id)
      toast.success('Budget deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete budget'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [budgets, selectedBudget, onBudgetDeleted])

  const selectBudget = useCallback((budget: Budget | null) => {
    setSelectedBudget(budget)
  }, [])

  return {
    budgets,
    selectedBudget,
    createBudget,
    updateBudget,
    deleteBudget,
    selectBudget,
    setBudgets,
    isLoading,
    error
  }
}