import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { transformBudgetWithSpending, getTransactionsByDateRange } from '@/lib/budget-utils'
import { Transaction } from '@/types/database'

// Add debug logging
console.log('📁 useBudgetData.ts file loaded at:', new Date().toISOString())
console.log('📁 React hooks imported:', { useState, useEffect, useCallback, useRef })

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
  console.log('🎯 useBudgetData hook called with:', {
    userId,
    selectedYear,
    selectedMonth,
    timeRange,
    transactionsLength: transactions.length
  })
  console.log('🔧 Hook execution started - checking if useEffect will run...')
  
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [testCounter, setTestCounter] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  
  // Memoized URL construction to prevent unnecessary re-computations
  const apiUrl = useMemo(() => {
    let url = `/api/budgets?userId=${userId}&year=${selectedYear}&active=true`
    if (timeRange === 'monthly') {
      url += `&month=${selectedMonth}`
    }
    return url
  }, [userId, selectedYear, selectedMonth, timeRange]) // Optimized: memoized URL construction

  // Fetch function with optimized dependencies
  const fetchBudgets = useCallback(async () => {
    console.log('🔍 fetchBudgets called')
    
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching budgets from:', apiUrl)
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch budgets: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📊 Raw budget data:', data)
      
      const budgetData = Array.isArray(data) ? data : []
      console.log('🔄 About to set budgets state with:', budgetData.length, 'items')
      
      // Force state update by using functional update
      setBudgets(prevBudgets => {
        console.log('🔄 setBudgets functional update - prev:', prevBudgets.length, 'new:', budgetData.length)
        return budgetData
      })
      console.log('✅ setBudgets called successfully')
      
      // Auto-select the first active budget
      const activeBudget = budgetData.find((budget: Budget) => budget.is_active)
      if (activeBudget) {
        setSelectedBudget(prevSelected => {
          console.log('🔄 setSelectedBudget functional update - prev:', prevSelected?.name, 'new:', activeBudget.name)
          return activeBudget
        })
        console.log('✅ Selected budget:', activeBudget.name)
      } else {
        setSelectedBudget(null)
        console.log('❌ No active budget found')
      }
    } catch (error) {
      console.error('❌ Error fetching budgets:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch budgets')
      setBudgets([])
      setSelectedBudget(null)
    } finally {
      setLoading(false)
    }
  }, [userId, selectedYear, selectedMonth, timeRange])

  // Use a ref to track if we've attempted to fetch
  const hasFetchedRef = useRef(false)
  
  // Mount effect to set mounted state
  useEffect(() => {
    console.log('🏔️ MOUNT EFFECT: Setting mounted state')
    setIsMounted(true)
  }, [])

  // Fetch effect that runs when component is mounted
  useEffect(() => {
    console.log('🌊 FETCH EFFECT: isMounted =', isMounted)
    if (isMounted && !hasFetchedRef.current) {
      console.log('🚀 FETCH EFFECT: Calling fetchBudgets after mount')
      hasFetchedRef.current = true
      fetchBudgets().catch(error => {
        console.error('🚀 FETCH EFFECT: Error in fetchBudgets:', error)
      })
    } else if (isMounted) {
      console.log('🚫 FETCH EFFECT: Already fetched')
    } else {
      console.log('🚫 FETCH EFFECT: Not mounted yet')
    }
  }, [isMounted, fetchBudgets])

  // Memoized filtered transactions to prevent unnecessary recalculations
  const filteredTransactions = useMemo(() => {
    return getTransactionsByDateRange(
      transactions,
      timeRange,
      selectedYear,
      selectedMonth
    )
  }, [transactions, timeRange, selectedYear, selectedMonth])

  // Memoized transformed budgets to prevent expensive recalculations
  const transformedBudgets = useMemo(() => {
    return (budgets || []).map(budget => 
      transformBudgetWithSpending(budget, filteredTransactions)
    )
  }, [budgets, filteredTransactions])

  console.log('🎯 useBudgetData returning budgets:', budgets, 'testCounter:', testCounter)
  
  // Optimized refetch function using memoized URL
  const refetchBudgets = useCallback(async () => {
    console.log('🔄 Manual refetch triggered')
    // Trigger a re-render by updating a dependency
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch budgets: ${response.statusText}`)
      }
      
      const data = await response.json()
      const budgetData = Array.isArray(data) ? data : []
      setBudgets(budgetData)
      
      const activeBudget = budgetData.find((budget: Budget) => budget.is_active)
      if (activeBudget) {
        setSelectedBudget(activeBudget)
      } else {
        setSelectedBudget(null)
      }
    } catch (error) {
      console.error('❌ Error in manual refetch:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch budgets')
      setBudgets([])
      setSelectedBudget(null)
    } finally {
      setLoading(false)
    }
  }, [userId, selectedYear, selectedMonth, timeRange])

  return {
    budgets,
    transformedBudgets,
    selectedBudget,
    filteredTransactions,
    loading,
    error,
    testCounter,
    setSelectedBudget,
    refetchBudgets,
  }
}