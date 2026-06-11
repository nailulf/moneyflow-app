import {
  filterTransactions,
  groupByDate,
  summarize,
  relativeDayLabel,
  type TransactionFilters,
} from '@/lib/transaction-filters'
import type { Transaction } from '@/types/database'

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: 'x', user_id: 'u', date: '2025-06-07', description: '', amount: 0, type: 'EXPENSE',
    category_id: null, account_id: null, to_account_id: null, currency: 'IDR',
    merchant: null, notes: null, tags: null, is_recurring: false, recurring_frequency: null,
    recurring_end_date: null, last_processed_date: null, statement_id: null, raw_data: null,
    posting_date: null, is_duplicate: false, duplicate_of: null,
    created_at: '', updated_at: '', ...over,
  } as Transaction
}

const base: TransactionFilters = {
  type: 'ALL', month: { year: 2025, month: 5 }, search: '', categoryIds: [], accountIds: [],
}

describe('filterTransactions', () => {
  it('filters by type', () => {
    const list = [tx({ id: 'a', type: 'INCOME' }), tx({ id: 'b', type: 'EXPENSE' })]
    expect(filterTransactions(list, { ...base, type: 'INCOME' }).map(t => t.id)).toEqual(['a'])
  })
  it('filters to the selected calendar month', () => {
    const list = [tx({ id: 'jun', date: '2025-06-07' }), tx({ id: 'may', date: '2025-05-30' })]
    expect(filterTransactions(list, base).map(t => t.id)).toEqual(['jun'])
  })
  it('searches merchant, description, and notes (case-insensitive)', () => {
    const list = [
      tx({ id: 'm', merchant: 'Kopi Kenangan' }),
      tx({ id: 'd', description: 'GRAB ride' }),
      tx({ id: 'n', notes: 'reimburse later' }),
      tx({ id: 'no', merchant: 'Indomaret' }),
    ]
    expect(filterTransactions(list, { ...base, search: 'kopi' }).map(t => t.id)).toEqual(['m'])
    expect(filterTransactions(list, { ...base, search: 'grab' }).map(t => t.id)).toEqual(['d'])
    expect(filterTransactions(list, { ...base, search: 'REIMBURSE' }).map(t => t.id)).toEqual(['n'])
  })
  it('filters by category and account membership', () => {
    const list = [
      tx({ id: 'c1', category_id: 'cat1', account_id: 'acc1' }),
      tx({ id: 'c2', category_id: 'cat2', account_id: 'acc2' }),
    ]
    expect(filterTransactions(list, { ...base, categoryIds: ['cat1'] }).map(t => t.id)).toEqual(['c1'])
    expect(filterTransactions(list, { ...base, accountIds: ['acc2'] }).map(t => t.id)).toEqual(['c2'])
  })
  it('filters by amount magnitude regardless of stored sign', () => {
    const list = [tx({ id: 'small', amount: -10 }), tx({ id: 'big', amount: -1000 })]
    expect(filterTransactions(list, { ...base, amountMin: 100 }).map(t => t.id)).toEqual(['big'])
    expect(filterTransactions(list, { ...base, amountMax: 100 }).map(t => t.id)).toEqual(['small'])
  })
})

describe('groupByDate', () => {
  it('groups by day, newest day first', () => {
    const list = [tx({ id: 'a', date: '2025-06-05' }), tx({ id: 'b', date: '2025-06-07' }), tx({ id: 'c', date: '2025-06-07' })]
    const groups = groupByDate(list)
    expect(groups.map(g => g.dateKey)).toEqual(['2025-06-07', '2025-06-05'])
    expect(groups[0].items.map(t => t.id)).toEqual(['b', 'c'])
  })
})

describe('summarize', () => {
  it('sums income and expense magnitudes, excluding transfers', () => {
    const list = [tx({ type: 'INCOME', amount: 1000 }), tx({ type: 'EXPENSE', amount: -300 }), tx({ type: 'TRANSFER', amount: -500 })]
    expect(summarize(list)).toEqual({ income: 1000, expense: 300 })
  })
})

describe('relativeDayLabel', () => {
  it('labels today and yesterday relative to a reference key', () => {
    expect(relativeDayLabel('2025-06-07', '2025-06-07')).toBe('today')
    expect(relativeDayLabel('2025-06-06', '2025-06-07')).toBe('yesterday')
    expect(relativeDayLabel('2025-06-01', '2025-06-07')).toBeNull()
  })
})
