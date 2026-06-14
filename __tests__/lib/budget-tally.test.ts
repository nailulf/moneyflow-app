import { calculateCategorySpending } from '@/lib/budget-utils'
import type { Transaction } from '@/types/database'

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: 'x', user_id: 'u', date: '2026-06-07', description: '', amount: 0, type: 'EXPENSE',
    category_id: 'food', account_id: 'A', to_account_id: null, currency: 'IDR',
    merchant: null, notes: null, tags: null, is_recurring: false, recurring_frequency: null,
    recurring_end_date: null, last_processed_date: null, statement_id: null, raw_data: null,
    posting_date: null, is_duplicate: false, duplicate_of: null, is_balance_adjustment: false,
    created_at: '', updated_at: '', ...over,
  } as Transaction
}

it('sums only EXPENSE transactions in the category', () => {
  const txns = [
    tx({ category_id: 'food', type: 'EXPENSE', amount: 100 }),
    tx({ category_id: 'food', type: 'EXPENSE', amount: 50 }),
    tx({ category_id: 'food', type: 'INCOME', amount: 999 }),     // income excluded
    tx({ category_id: 'transport', type: 'EXPENSE', amount: 70 }), // other category excluded
  ]
  expect(calculateCategorySpending(txns, 'food')).toBe(150)
})

it('never counts TRANSFER as spending', () => {
  const txns = [tx({ category_id: 'food', type: 'TRANSFER', amount: 500, to_account_id: 'B' })]
  expect(calculateCategorySpending(txns, 'food')).toBe(0)
})

it('DOES count an adjustment expense booked to the Other category', () => {
  const txns = [tx({ category_id: 'other-expense', type: 'EXPENSE', amount: 200, is_balance_adjustment: true })]
  expect(calculateCategorySpending(txns, 'other-expense')).toBe(200)
})
