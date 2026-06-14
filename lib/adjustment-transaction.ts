// lib/adjustment-transaction.ts
export type AdjustmentDelta = { type: 'INCOME' | 'EXPENSE'; amount: number }

/** Delta to move currentBalance → newBalance, as a transaction. null when no change. */
export function computeAdjustmentDelta(newBalance: number, currentBalance: number): AdjustmentDelta | null {
  const diff = Math.round((newBalance - currentBalance) * 100) / 100
  if (diff === 0) return null
  return diff > 0 ? { type: 'INCOME', amount: diff } : { type: 'EXPENSE', amount: Math.abs(diff) }
}

export interface AdjustmentPayloadArgs {
  userId: string
  accountId: string
  newBalance: number
  currentBalance: number
  categoryId: string | null
  currency: string
  date: string // YYYY-MM-DD
}

export function buildAdjustmentPayload(a: AdjustmentPayloadArgs) {
  const delta = computeAdjustmentDelta(a.newBalance, a.currentBalance)
  if (!delta) return null
  return {
    user_id: a.userId,
    account_id: a.accountId,
    to_account_id: null,
    date: a.date,
    description: 'Balance adjustment',
    amount: delta.amount,
    type: delta.type,
    category_id: a.categoryId,
    currency: a.currency,
    is_recurring: false,
    is_balance_adjustment: true,
  }
}
