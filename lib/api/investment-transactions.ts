import type { Database } from '@/types/database'

export type InvestmentTxn = Database['public']['Tables']['investment_transactions']['Row']

export type CreateTxnPayload = {
  type: 'BUY' | 'SELL' | 'DIVIDEND'
  quantity: number
  price_per_unit: number
  transaction_date: string
  total_amount?: number
  currency?: string
  notes?: string | null
  cash_account_id?: string | null
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error || 'Request failed')
  return body as T
}

const base = (accountId: string, holdingId: string) =>
  `/api/accounts/${accountId}/holdings/${holdingId}/transactions`

export async function listTransactions(accountId: string, holdingId: string): Promise<InvestmentTxn[]> {
  const { transactions } = await jsonOrThrow<{ transactions: InvestmentTxn[] }>(
    await fetch(base(accountId, holdingId))
  )
  return transactions
}

export async function addTransaction(accountId: string, holdingId: string, payload: CreateTxnPayload): Promise<InvestmentTxn> {
  const { transaction } = await jsonOrThrow<{ transaction: InvestmentTxn }>(
    await fetch(base(accountId, holdingId), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
  )
  return transaction
}

export async function updateTransaction(accountId: string, holdingId: string, txnId: string, patch: Partial<CreateTxnPayload>): Promise<InvestmentTxn> {
  const { transaction } = await jsonOrThrow<{ transaction: InvestmentTxn }>(
    await fetch(`${base(accountId, holdingId)}/${txnId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
  )
  return transaction
}

export async function deleteTransaction(accountId: string, holdingId: string, txnId: string): Promise<void> {
  await jsonOrThrow<{ success: true }>(
    await fetch(`${base(accountId, holdingId)}/${txnId}`, { method: 'DELETE' })
  )
}
