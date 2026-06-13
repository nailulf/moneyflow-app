import { buildGeneratedTransaction } from '@/lib/recurring-processor'

const template = {
  user_id: 'u', account_id: 'A', to_account_id: 'B', type: 'TRANSFER' as const,
  amount: 500, description: 'Move savings', category_id: 'transfer-cat',
  merchant: null, notes: null, tags: null, currency: 'USD',
}

it('clones to_account_id for a recurring transfer', () => {
  const row = buildGeneratedTransaction(template, '2026-06-13')
  expect(row.to_account_id).toBe('B')
  expect(row.type).toBe('TRANSFER')
})

it('clones currency so non-IDR recurring keeps its currency', () => {
  const row = buildGeneratedTransaction(template, '2026-06-13')
  expect(row.currency).toBe('USD')
})

it('the generated row is not itself recurring and is dated today', () => {
  const row = buildGeneratedTransaction(template, '2026-06-13')
  expect(row.is_recurring).toBe(false)
  expect(row.date).toBe('2026-06-13')
})
