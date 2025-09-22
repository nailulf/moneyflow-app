import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { transformBudgetWithSpending, getTransactionsByDateRange } from '@/lib/budget-utils'
import { Transaction } from '@/types/database'

// Budget interface matching the API response
interface Budget {
  id: string
  name: string
  total_amount: number
  period: 'monthly' | 'yearly'
  year: number
  month?: number
  currency: string
  is_active: boolean
  budget_categories: {
    id: string
    allocated_amount: number
    spent_amount: number
    category: {
      id: string
      name: string
      color: string
    }
  }[]
}

export function useBudgetData(
  userId: string,
  selectedYear: number,
  selectedMonth: number,
  timeRange: 'monthly' | 'yearly',
  transactions: Transaction[]
) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const isMounted = useRef(false)
  const testCounter = useRef(0)

  // Fetch budgets from API
  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const apiUrl = `/api/budgets?userId=${userId}&year=${selectedYear}&month=${selectedMonth}&period=${timeRange}`
      
      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch budgets: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      const budgetData = data.map((budget: Budget) => 
         transformBudgetWithSpending(budget, transactions)
       )
      
      setBudgets((prevBudgets) => {
        return budgetData
      })
      
      // Set the active budget as selected
      const activeBudget = budgetData.find((budget: Budget) => budget.is_active)
      if (activeBudget) {
        setSelectedBudget((prevSelected) => {
          return activeBudget
        })
      }
      
      setHasFetched(true)
    } catch (err) {
      console.error('Error fetching budgets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch budgets')
    } finally {
      setLoading(false)
    }
  }, [userId, selectedYear, selectedMonth, timeRange, transactions])

  // Track mount state
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Fetch budgets when component mounts or dependencies change
  useEffect(() => {
    if (isMounted.current) {
      if (!hasFetched) {
        fetchBudgets()
      }
    }
  }, [fetchBudgets, hasFetched])

  // Memoized return value
  const returnValue = useMemo(() => {
    testCounter.current += 1
    return {
      budgets,
      selectedBudget,
      loading,
      error,
      refetch: () => {
        setHasFetched(false)
      }
    }
  }, [budgets, selectedBudget, loading, error])

  return returnValue
}