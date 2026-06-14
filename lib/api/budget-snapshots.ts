export interface SnapshotCategoryWithSpending {
  id: string
  category_id: string
  allocated_amount: number
  spent_amount: number
  categories: {
    id: string
    name: string
    color: string
  }
}

export interface BudgetSnapshotWithSpending {
  id: string
  user_id: string
  period: 'monthly' | 'yearly'
  year: number
  month: number | null
  total_amount: number
  currency: string
  status: 'active' | 'closed' | 'upcoming'
  created_at: string
  budget_snapshot_categories: SnapshotCategoryWithSpending[]
  total_spent: number
}

export interface SnapshotNotFound {
  noSnapshot: true
  noPlan?: boolean
}

export async function getBudgetSnapshot(
  userId: string,
  period: 'monthly' | 'yearly',
  year: number,
  month?: number
): Promise<BudgetSnapshotWithSpending | null> {
  const params = new URLSearchParams({
    userId,
    period,
    year: String(year),
  })
  if (period === 'monthly' && month) {
    params.set('month', String(month))
  }

  const res = await fetch(`/api/budget-snapshots?${params.toString()}`, {
    cache: 'no-store',
  })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error('Failed to fetch budget snapshot')
  }

  return res.json()
}
