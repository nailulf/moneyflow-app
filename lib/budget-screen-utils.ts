import type { BudgetSnapshotWithSpending } from '@/lib/api/budget-snapshots'
import { calculateBudgetStatus, type BudgetStatus } from '@/lib/budget-utils'

export interface BudgetOverviewData {
  budget: number
  spent: number
  left: number
  pct: number
  over: boolean
}

export function overviewFromSnapshot(snapshot: BudgetSnapshotWithSpending): BudgetOverviewData {
  const budget = snapshot.total_amount
  const spent = snapshot.total_spent
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0
  return { budget, spent, left: Math.max(0, budget - spent), pct, over: spent > budget }
}

export interface CategoryBudgetRow {
  categoryId: string
  name: string
  allocated: number
  spent: number
  pct: number
  status: BudgetStatus
}

/** Rows sorted by allocation (desc) with per-category status. */
export function categoryRowsFromSnapshot(snapshot: BudgetSnapshotWithSpending): CategoryBudgetRow[] {
  return [...snapshot.budget_snapshot_categories]
    .sort((a, b) => b.allocated_amount - a.allocated_amount)
    .map((c) => ({
      categoryId: c.category_id,
      name: c.categories.name,
      allocated: c.allocated_amount,
      spent: c.spent_amount,
      pct: c.allocated_amount > 0 ? Math.round((c.spent_amount / c.allocated_amount) * 100) : 0,
      status: calculateBudgetStatus(c.spent_amount, c.allocated_amount),
    }))
}
