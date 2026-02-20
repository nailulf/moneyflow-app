'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getBudgetPlan,
  type BudgetPlanWithCategories,
} from '@/lib/api/budget-plans'

interface UseBudgetPlanReturn {
  plan: BudgetPlanWithCategories | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBudgetPlan(
  period: 'monthly' | 'yearly',
  enabled: boolean = true
): UseBudgetPlanReturn {
  const { user } = useAuth()
  const [plan, setPlan] = useState<BudgetPlanWithCategories | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchPlan = useCallback(async () => {
    if (!user?.id || !enabled) return

    const currentRequestId = ++requestIdRef.current

    try {
      setIsLoading(true)
      setError(null)

      const data = await getBudgetPlan(user.id, period)

      if (currentRequestId !== requestIdRef.current) return
      setPlan(data)
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return
      const msg = err instanceof Error ? err.message : 'Failed to load budget plan'
      setError(msg)
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [user?.id, period, enabled])

  useEffect(() => {
    if (enabled) {
      fetchPlan()
    }
  }, [fetchPlan, enabled])

  return {
    plan,
    isLoading,
    error,
    refetch: fetchPlan,
  }
}
