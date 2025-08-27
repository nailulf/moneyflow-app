'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

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

interface Budget {
  id: string
  name: string
  total_amount: number
  period: 'monthly' | 'yearly'
  year: number
  month?: number
  currency: string
  is_active: boolean
  budget_categories: BudgetCategory[]
}

interface UseBudgetManagerProps {
  userId?: string
  autoFetch?: boolean
  year?: number
  month?: number
  onBudgetCreated?: (budget: Budget) => void
  onBudgetUpdated?: (budget: Budget) => void
  onBudgetDeleted?: (budgetId: string) => void
}

interface UseBudgetManagerReturn {
  budgets: Budget[]
  selectedBudget: Budget | null
  fetchBudgets: () => Promise<void>
  createBudget: (budgetData: any) => Promise<void>
  updateBudget: (id: string, budgetData: Partial<Budget>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  selectBudget: (budget: Budget | null) => void
  setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>
  isLoading: boolean
  error: string | null
}

export function useBudgetManager({
  userId,
  autoFetch = true,
  year,
  month,
  onBudgetCreated,
  onBudgetUpdated,
  onBudgetDeleted
}: UseBudgetManagerProps = {}): UseBudgetManagerReturn {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const currentDate = new Date()
      const targetYear = year || currentDate.getFullYear()
      const targetMonth = month || (currentDate.getMonth() + 1)
      
      const response = await fetch(`/api/budgets?year=${targetYear}&month=${targetMonth}&active=true`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch budgets')
      }
      
      const data = await response.json()
      setBudgets(data.budgets || [])
      
      // Auto-select the first active budget
      if (data.budgets && data.budgets.length > 0) {
        setSelectedBudget(data.budgets[0])
      } else {
        setSelectedBudget(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch budgets'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    if (autoFetch) {
      fetchBudgets()
    }
  }, [autoFetch, fetchBudgets])

  const createBudget = useCallback(async (budgetData: any) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(budgetData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create budget')
      }
      
      const data = await response.json()
      const newBudget = data.budget
      
      setBudgets(prev => [newBudget, ...prev])
      setSelectedBudget(newBudget)
      
      onBudgetCreated?.(newBudget)
      toast.success('Budget created successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create budget'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [onBudgetCreated])

  const updateBudget = useCallback(async (id: string, budgetData: Partial<Budget>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(budgetData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update budget')
      }
      
      const data = await response.json()
      const updatedBudget = data.budget
      
      setBudgets(prev => prev.map(budget => 
        budget.id === id ? updatedBudget : budget
      ))
      
      // Update selected budget if it's the one being updated
      if (selectedBudget?.id === id) {
        setSelectedBudget(updatedBudget)
      }
      
      onBudgetUpdated?.(updatedBudget)
      toast.success('Budget updated successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update budget'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [selectedBudget, onBudgetUpdated])

  const deleteBudget = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete budget')
      }
      
      setBudgets(prev => {
        const filtered = prev.filter(budget => budget.id !== id)
        
        // Clear selected budget if it's the one being deleted
        if (selectedBudget?.id === id) {
          setSelectedBudget(filtered[0] || null)
        }
        
        return filtered
      })
      
      onBudgetDeleted?.(id)
      toast.success('Budget deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete budget'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [selectedBudget, onBudgetDeleted])

  const selectBudget = useCallback((budget: Budget | null) => {
    setSelectedBudget(budget)
  }, [])

  return {
    budgets,
    selectedBudget,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    selectBudget,
    setBudgets,
    isLoading,
    error
  }
}