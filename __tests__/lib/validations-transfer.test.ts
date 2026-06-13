import { apiTransactionSchema } from '@/lib/validations'

// Valid RFC-4122 v4 UUIDs (version nibble 4, variant nibble 8) so .uuid() passes
// and the .refine() rule is what these tests actually exercise.
const SRC = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DST = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const base = {
  user_id: '11111111-1111-4111-8111-111111111111',
  date: '2026-06-13', description: 'x', amount: 100, currency: 'IDR',
}

it('rejects a TRANSFER without to_account_id', () => {
  const r = apiTransactionSchema.safeParse({ ...base, type: 'TRANSFER', account_id: SRC })
  expect(r.success).toBe(false)
})

it('rejects a TRANSFER whose destination equals the source', () => {
  const r = apiTransactionSchema.safeParse({ ...base, type: 'TRANSFER', account_id: SRC, to_account_id: SRC })
  expect(r.success).toBe(false)
})

it('accepts a valid TRANSFER', () => {
  const r = apiTransactionSchema.safeParse({ ...base, type: 'TRANSFER', account_id: SRC, to_account_id: DST })
  expect(r.success).toBe(true)
})

it('accepts is_balance_adjustment', () => {
  const r = apiTransactionSchema.safeParse({ ...base, type: 'EXPENSE', is_balance_adjustment: true })
  expect(r.success).toBe(true)
})
