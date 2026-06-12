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

import type { Transaction } from '@/types/database'

const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth()

/** Period income: monthly = current month; yearly = year-to-date. */
export function incomeReference(transactions: Transaction[], period: 'monthly' | 'yearly', now: Date): number {
  return transactions
    .filter((t) => {
      if (t.type !== 'INCOME') return false
      const d = new Date(t.date)
      if (d.getFullYear() !== now.getFullYear()) return false
      return period === 'yearly' || d.getMonth() === now.getMonth()
    })
    .reduce((s, t) => s + Math.abs(t.amount), 0)
}

/** Per-category average of the previous 3 FULL months of expenses, rounded to 1000. */
export function suggestedAmounts(transactions: Transaction[], now: Date): Map<string, number> {
  const nowKey = monthKey(now)
  const sums = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'EXPENSE') continue
    const k = monthKey(new Date(t.date))
    if (k >= nowKey || k < nowKey - 3) continue
    sums.set(t.category_id, (sums.get(t.category_id) ?? 0) + Math.abs(t.amount))
  }
  const out = new Map<string, number>()
  for (const [id, total] of sums) out.set(id, Math.round(total / 3 / 1000) * 1000)
  return out
}

export interface PlanDiffRow {
  categoryId: string
  name: string
  from: number
  to: number
}

interface DiffCat {
  category_id: string
  category_name: string
  allocated_amount: number
}

/** Changed/removed/added allocations for the confirm sheet (old order first, then additions). */
export function planDiff(oldCats: DiffCat[], newCats: DiffCat[]): PlanDiffRow[] {
  const newById = new Map(newCats.map((c) => [c.category_id, c]))
  const rows: PlanDiffRow[] = []
  for (const o of oldCats) {
    const n = newById.get(o.category_id)
    const to = n?.allocated_amount ?? 0
    if (to !== o.allocated_amount) {
      rows.push({ categoryId: o.category_id, name: o.category_name, from: o.allocated_amount, to })
    }
    newById.delete(o.category_id)
  }
  for (const n of newById.values()) {
    rows.push({ categoryId: n.category_id, name: n.category_name, from: 0, to: n.allocated_amount })
  }
  return rows
}

interface SnapshotLike {
  total_amount: number
  budget_snapshot_categories: Array<{
    category_id: string
    allocated_amount: number
    categories: { id: string; name: string; color: string }
  }>
}

export function seedFromSnapshot(snapshot: SnapshotLike): {
  total: number
  categories: Array<{ category_id: string; category_name: string; category_color: string; allocated_amount: number }>
} {
  return {
    total: snapshot.total_amount,
    categories: snapshot.budget_snapshot_categories.map((c) => ({
      category_id: c.category_id,
      category_name: c.categories.name,
      category_color: c.categories.color,
      allocated_amount: c.allocated_amount,
    })),
  }
}

interface TemplateLike {
  allocations: Record<string, number>
  category_mappings: Record<string, string[]>
}

interface CategoryLike {
  id: string
  name: string
  color: string
}

/** Template buckets (% of income) split evenly across the user's matching categories. */
export function seedFromTemplate(
  template: TemplateLike,
  income: number,
  categories: CategoryLike[]
): Array<{ category_id: string; category_name: string; category_color: string; allocated_amount: number }> {
  const byName = new Map(categories.map((c) => [c.name, c]))
  const out: Array<{ category_id: string; category_name: string; category_color: string; allocated_amount: number }> = []
  for (const [bucket, pct] of Object.entries(template.allocations)) {
    const mapped = (template.category_mappings[bucket] ?? [])
      .map((name) => byName.get(name))
      .filter((c): c is CategoryLike => c !== undefined)
    if (mapped.length === 0) continue
    const per = Math.round((income * pct) / 100 / mapped.length / 1000) * 1000
    for (const c of mapped) {
      out.push({ category_id: c.id, category_name: c.name, category_color: c.color, allocated_amount: per })
    }
  }
  return out
}
