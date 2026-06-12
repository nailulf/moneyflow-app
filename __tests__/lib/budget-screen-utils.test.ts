import { overviewFromSnapshot, categoryRowsFromSnapshot } from '@/lib/budget-screen-utils'
import type { BudgetSnapshotWithSpending } from '@/lib/api/budget-snapshots'

const snap = (over: Partial<BudgetSnapshotWithSpending>): BudgetSnapshotWithSpending =>
  ({
    id: 's1', user_id: 'u', period: 'monthly', year: 2026, month: 6,
    total_amount: 8_500_000, currency: 'IDR', status: 'active', created_at: '',
    total_spent: 5_200_000,
    budget_snapshot_categories: [],
    ...over,
  }) as BudgetSnapshotWithSpending

const cat = (id: string, name: string, allocated: number, spent: number) => ({
  id: `r-${id}`, category_id: id, allocated_amount: allocated, spent_amount: spent,
  categories: { id, name, color: '#000' },
})

describe('overviewFromSnapshot', () => {
  it('derives budget/spent/left/pct', () => {
    expect(overviewFromSnapshot(snap({}))).toEqual({
      budget: 8_500_000, spent: 5_200_000, left: 3_300_000, pct: 61, over: false,
    })
  })
  it('clamps left at 0 and flags over when spent exceeds budget', () => {
    const o = overviewFromSnapshot(snap({ total_spent: 9_000_000 }))
    expect(o.left).toBe(0)
    expect(o.over).toBe(true)
    expect(o.pct).toBe(106)
  })
  it('handles zero budget without dividing by zero', () => {
    expect(overviewFromSnapshot(snap({ total_amount: 0, total_spent: 0 })).pct).toBe(0)
  })
})

describe('categoryRowsFromSnapshot', () => {
  it('maps categories to rows sorted by allocation desc with status', () => {
    const s = snap({
      budget_snapshot_categories: [
        cat('c1', 'Transport', 500_000, 210_000),
        cat('c2', 'Food & Dining', 1_500_000, 1_400_000),   // 93% → warning
        cat('c3', 'Shopping', 700_000, 1_000_000),           // over
      ],
    })
    const rows = categoryRowsFromSnapshot(s)
    expect(rows.map((r) => r.name)).toEqual(['Food & Dining', 'Shopping', 'Transport'])
    expect(rows[0]).toEqual({
      categoryId: 'c2', name: 'Food & Dining', allocated: 1_500_000, spent: 1_400_000,
      pct: 93, status: 'warning',
    })
    expect(rows[1].status).toBe('over')
    expect(rows[2].status).toBe('good')
  })
  it('returns empty for no categories', () => {
    expect(categoryRowsFromSnapshot(snap({}))).toEqual([])
  })
})
