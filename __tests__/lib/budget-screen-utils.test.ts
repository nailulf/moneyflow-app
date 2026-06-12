import { overviewFromSnapshot, categoryRowsFromSnapshot } from '@/lib/budget-screen-utils'
import {
  incomeReference, suggestedAmounts, planDiff, seedFromSnapshot, seedFromTemplate,
} from '@/lib/budget-screen-utils'
import type { Transaction } from '@/types/database'
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

const txn = (over: Partial<Transaction>): Transaction =>
  ({
    id: 'x', user_id: 'u', date: '2026-06-10', description: '', amount: -100,
    type: 'EXPENSE', category_id: 'c1', account_id: 'a1', to_account_id: null,
    currency: 'IDR', merchant: null, notes: null, tags: null, is_recurring: false,
    recurring_frequency: null, recurring_end_date: null, last_processed_date: null,
    statement_id: null, raw_data: null, posting_date: null, is_duplicate: false,
    duplicate_of: null, created_at: '', updated_at: '', ...over,
  }) as Transaction

const NOW = new Date('2026-06-12T10:00:00')

describe('incomeReference', () => {
  const list = [
    txn({ type: 'INCOME', amount: 12_500_000, date: '2026-06-01' }),
    txn({ type: 'INCOME', amount: 1_000_000, date: '2026-05-15' }),
    txn({ type: 'INCOME', amount: 2_000_000, date: '2026-01-20' }),
    txn({ type: 'EXPENSE', amount: -500_000, date: '2026-06-05' }),
  ]
  it('monthly = current-month income only', () => {
    expect(incomeReference(list, 'monthly', NOW)).toBe(12_500_000)
  })
  it('yearly = year-to-date income', () => {
    expect(incomeReference(list, 'yearly', NOW)).toBe(15_500_000)
  })
})

describe('suggestedAmounts', () => {
  it('averages the previous 3 full months of spending per category, rounded to 1000', () => {
    const list = [
      txn({ category_id: 'food', amount: -300_000, date: '2026-05-10' }),
      txn({ category_id: 'food', amount: -350_000, date: '2026-04-10' }),
      txn({ category_id: 'food', amount: -250_000, date: '2026-03-10' }),
      txn({ category_id: 'food', amount: -999_000, date: '2026-06-01' }),  // current month ignored
      txn({ category_id: 'food', amount: -999_000, date: '2026-02-01' }),  // older ignored
      txn({ category_id: 'transport', amount: -100_500, date: '2026-05-20' }),
      txn({ type: 'INCOME', category_id: 'food', amount: 5_000_000, date: '2026-05-01' }), // income ignored
    ]
    const s = suggestedAmounts(list, NOW)
    expect(s.get('food')).toBe(300_000)            // (300k+350k+250k)/3
    expect(s.get('transport')).toBe(34_000)        // 100.5k/3 → 33.5k → round 1000 → 34k
    expect(s.get('missing')).toBeUndefined()
  })
})

describe('planDiff', () => {
  const oldCats = [
    { category_id: 'c1', category_name: 'Food & Dining', allocated_amount: 1_500_000 },
    { category_id: 'c2', category_name: 'Transport', allocated_amount: 500_000 },
  ]
  const newCats = [
    { category_id: 'c1', category_name: 'Food & Dining', allocated_amount: 1_800_000 },
    { category_id: 'c3', category_name: 'Health', allocated_amount: 750_000 },
  ]
  it('lists changed, removed (→0) and added (0→) categories only', () => {
    expect(planDiff(oldCats, newCats)).toEqual([
      { categoryId: 'c1', name: 'Food & Dining', from: 1_500_000, to: 1_800_000 },
      { categoryId: 'c2', name: 'Transport', from: 500_000, to: 0 },
      { categoryId: 'c3', name: 'Health', from: 0, to: 750_000 },
    ])
  })
  it('returns empty when nothing changed', () => {
    expect(planDiff(oldCats, oldCats)).toEqual([])
  })
})

describe('seedFromSnapshot', () => {
  it('maps snapshot categories into loadFromExistingBudget input', () => {
    const snapshot = {
      total_amount: 8_500_000,
      budget_snapshot_categories: [
        { id: 'r1', category_id: 'c1', allocated_amount: 1_500_000, spent_amount: 1_400_000, categories: { id: 'c1', name: 'Food & Dining', color: '#f00' } },
      ],
    }
    expect(seedFromSnapshot(snapshot as never)).toEqual({
      total: 8_500_000,
      categories: [
        { category_id: 'c1', category_name: 'Food & Dining', category_color: '#f00', allocated_amount: 1_500_000 },
      ],
    })
  })
})

describe('seedFromTemplate', () => {
  const template = {
    id: 't1', name: '50/30/20',
    allocations: { needs: 50, wants: 30, savings: 20 },
    category_mappings: { needs: ['Food & Dining', 'Bills & Utilities'], wants: ['Entertainment'], savings: [] },
  }
  const categories = [
    { id: 'c1', name: 'Food & Dining', color: '#a' },
    { id: 'c2', name: 'Bills & Utilities', color: '#b' },
    { id: 'c3', name: 'Entertainment', color: '#c' },
    { id: 'c4', name: 'Travel', color: '#d' },
  ]
  it('splits bucket percentages of income across mapped existing categories', () => {
    const seeded = seedFromTemplate(template as never, 10_000_000, categories as never)
    // needs 50% = 5M across 2 cats → 2.5M each; wants 30% = 3M to Entertainment
    expect(seeded).toEqual([
      { category_id: 'c1', category_name: 'Food & Dining', category_color: '#a', allocated_amount: 2_500_000 },
      { category_id: 'c2', category_name: 'Bills & Utilities', category_color: '#b', allocated_amount: 2_500_000 },
      { category_id: 'c3', category_name: 'Entertainment', category_color: '#c', allocated_amount: 3_000_000 },
    ])
  })
  it('skips buckets whose categories are absent', () => {
    expect(seedFromTemplate(template as never, 10_000_000, [] as never)).toEqual([])
  })
})
