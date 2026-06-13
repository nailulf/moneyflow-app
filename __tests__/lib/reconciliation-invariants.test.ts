import { computeAccountBalance, type LedgerTxn } from '@/lib/account-balance'
import { buildAdjustmentPayload } from '@/lib/adjustment-transaction'
import { buildGeneratedTransaction } from '@/lib/recurring-processor'

function t(over: Partial<LedgerTxn>): LedgerTxn {
  return { amount: 0, type: 'EXPENSE', date: '2026-06-01', account_id: 'A', to_account_id: null, currency: 'IDR', ...over }
}

it('a lazy account (opening + adjustments only) always equals the last stated balance', () => {
  // opening 1,000,000; user later "states" balance is 1,250,000 → adjustment of +250,000
  const adj = buildAdjustmentPayload({
    userId: 'u', accountId: 'A', newBalance: 1_250_000, currentBalance: 1_000_000,
    categoryId: 'other', currency: 'IDR', date: '2026-06-10',
  })!
  const txns: LedgerTxn[] = [{ ...adj, date: adj.date } as unknown as LedgerTxn]
  expect(computeAccountBalance({ accountId: 'A', opening: 1_000_000, transactions: txns })).toBe(1_250_000)
})

it('a transfer nets to zero across both accounts', () => {
  const transfer: LedgerTxn = t({ type: 'TRANSFER', amount: 300, account_id: 'A', to_account_id: 'B' })
  const a = computeAccountBalance({ accountId: 'A', opening: 1000, transactions: [transfer] })
  const b = computeAccountBalance({ accountId: 'B', opening: 0, transactions: [transfer] })
  expect(a).toBe(700)
  expect(b).toBe(300)
  expect((a - 1000) + (b - 0)).toBe(0) // money conserved
})

it('a recurring-generated transfer moves money on both legs', () => {
  const gen = buildGeneratedTransaction(
    { user_id: 'u', account_id: 'A', to_account_id: 'B', type: 'TRANSFER', amount: 500,
      description: 'd', category_id: null, merchant: null, notes: null, tags: null, currency: 'IDR' },
    '2026-06-13'
  ) as unknown as LedgerTxn
  expect(computeAccountBalance({ accountId: 'A', opening: 1000, transactions: [gen] })).toBe(500)
  expect(computeAccountBalance({ accountId: 'B', opening: 0, transactions: [gen] })).toBe(500)
})
