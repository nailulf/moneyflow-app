import { CategoryDB } from '@/types/database'

export interface BudgetPlanCategoryWithDetails {
  id: string
  category_id: string
  allocated_amount: number
  categories: {
    id: string
    name: string
    color: string
  }
}

export interface BudgetPlanWithCategories {
  id: string
  user_id: string
  period: 'monthly' | 'yearly'
  total_amount: number
  currency: string
  created_at: string
  updated_at: string
  budget_plan_categories: BudgetPlanCategoryWithDetails[]
}

export interface PlanCategoryInput {
  category_id: string
  allocated_amount: number
}

export async function getBudgetPlan(
  userId: string,
  period: 'monthly' | 'yearly'
): Promise<BudgetPlanWithCategories | null> {
  const res = await fetch(
    `/api/budget-plans?userId=${userId}&period=${period}`
  )
  if (!res.ok) {
    throw new Error('Failed to fetch budget plan')
  }
  return res.json()
}

export async function getBothBudgetPlans(
  userId: string
): Promise<BudgetPlanWithCategories[]> {
  const res = await fetch(`/api/budget-plans?userId=${userId}`)
  if (!res.ok) {
    throw new Error('Failed to fetch budget plans')
  }
  return res.json()
}

export async function createBudgetPlan(data: {
  userId: string
  period: 'monthly' | 'yearly'
  total_amount: number
  currency?: string
  categories?: PlanCategoryInput[]
}): Promise<BudgetPlanWithCategories> {
  const res = await fetch('/api/budget-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create budget plan')
  }
  return res.json()
}

export async function updateBudgetPlan(data: {
  id: string
  total_amount?: number
  currency?: string
  categories?: PlanCategoryInput[]
}): Promise<BudgetPlanWithCategories> {
  const res = await fetch('/api/budget-plans', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update budget plan')
  }
  return res.json()
}

export async function getAvailableCategories(
  userId: string,
  period: 'monthly' | 'yearly'
): Promise<CategoryDB[]> {
  const res = await fetch(
    `/api/budget-plans/available-categories?userId=${userId}&period=${period}`
  )
  if (!res.ok) {
    throw new Error('Failed to fetch available categories')
  }
  return res.json()
}
