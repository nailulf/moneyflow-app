'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getBothBudgetPlans,
  createBudgetPlan,
  updateBudgetPlan,
  type BudgetPlanWithCategories,
  type PlanCategoryInput,
} from '@/lib/api/budget-plans'

interface BudgetPlanContextType {
  monthlyPlan: BudgetPlanWithCategories | null
  yearlyPlan: BudgetPlanWithCategories | null
  loading: boolean
  error: string | null
  refreshPlans: () => Promise<void>
  savePlan: (
    period: 'monthly' | 'yearly',
    data: {
      total_amount: number
      currency?: string
      categories: PlanCategoryInput[]
    }
  ) => Promise<void>
}

const BudgetPlanContext = createContext<BudgetPlanContextType | undefined>(undefined)

export function BudgetPlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [monthlyPlan, setMonthlyPlan] = useState<BudgetPlanWithCategories | null>(null)
  const [yearlyPlan, setYearlyPlan] = useState<BudgetPlanWithCategories | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshPlans = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)
      const plans = await getBothBudgetPlans(user.id)

      setMonthlyPlan(plans.find((p) => p.period === 'monthly') || null)
      setYearlyPlan(plans.find((p) => p.period === 'yearly') || null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load budget plans'
      setError(msg)
      console.error('Error fetching budget plans:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    refreshPlans()
  }, [refreshPlans])

  const savePlan = useCallback(
    async (
      period: 'monthly' | 'yearly',
      data: {
        total_amount: number
        currency?: string
        categories: PlanCategoryInput[]
      }
    ) => {
      if (!user?.id) return

      const existingPlan = period === 'monthly' ? monthlyPlan : yearlyPlan

      try {
        if (existingPlan) {
          await updateBudgetPlan({
            id: existingPlan.id,
            total_amount: data.total_amount,
            currency: data.currency,
            categories: data.categories,
          })
        } else {
          await createBudgetPlan({
            userId: user.id,
            period,
            total_amount: data.total_amount,
            currency: data.currency,
            categories: data.categories,
          })
        }

        await refreshPlans()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save budget plan'
        throw new Error(msg)
      }
    },
    [user?.id, monthlyPlan, yearlyPlan, refreshPlans]
  )

  return (
    <BudgetPlanContext.Provider
      value={{
        monthlyPlan,
        yearlyPlan,
        loading,
        error,
        refreshPlans,
        savePlan,
      }}
    >
      {children}
    </BudgetPlanContext.Provider>
  )
}

export function useBudgetPlans() {
  const context = useContext(BudgetPlanContext)
  if (context === undefined) {
    throw new Error('useBudgetPlans must be used within a BudgetPlanProvider')
  }
  return context
}
