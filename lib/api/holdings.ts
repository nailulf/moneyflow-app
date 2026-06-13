import type { Database } from '@/types/database'
import type { SanitizedHolding } from '@/lib/portfolio-utils'

export type Holding = Database['public']['Tables']['portfolio_holdings']['Row']

/** Payload accepted by the POST /holdings route — required fields only; optional fields default server-side. */
export type CreateHoldingPayload = Pick<SanitizedHolding, 'asset_class' | 'name' | 'quantity' | 'purchase_price' | 'current_value'> &
  Partial<Pick<SanitizedHolding, 'symbol' | 'purchase_date' | 'currency'>>

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error || 'Request failed')
  return body as T
}

export async function listHoldings(accountId: string): Promise<Holding[]> {
  const res = await fetch(`/api/accounts/${accountId}/holdings`)
  const { holdings } = await jsonOrThrow<{ holdings: Holding[] }>(res)
  return holdings
}

export async function createHolding(accountId: string, payload: CreateHoldingPayload): Promise<Holding> {
  const res = await fetch(`/api/accounts/${accountId}/holdings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  const { holding } = await jsonOrThrow<{ holding: Holding }>(res)
  return holding
}

export async function updateHolding(accountId: string, holdingId: string, patch: Partial<SanitizedHolding>): Promise<Holding> {
  const res = await fetch(`/api/accounts/${accountId}/holdings/${holdingId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  })
  const { holding } = await jsonOrThrow<{ holding: Holding }>(res)
  return holding
}

export async function deleteHolding(accountId: string, holdingId: string): Promise<void> {
  const res = await fetch(`/api/accounts/${accountId}/holdings/${holdingId}`, { method: 'DELETE' })
  await jsonOrThrow<{ success: true }>(res)
}
