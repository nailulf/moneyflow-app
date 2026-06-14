export type AssetClass = 'IDX_STOCK' | 'US_STOCK' | 'MUTUAL_FUND' | 'ETF' | 'BOND' | 'OTHER'

export interface HoldingLike {
  id: string
  account_id: string
  asset_class: AssetClass
  symbol: string | null
  name: string
  quantity: number
  purchase_price: number
  current_value: number
  currency: string
}

export const SHARES_PER_LOT = 100
export const lotsToShares = (lots: number): number => lots * SHARES_PER_LOT
export const sharesToLots = (shares: number): number => shares / SHARES_PER_LOT

const round1 = (n: number): number => Math.round(n * 10) / 10

export const costBasis = (h: Pick<HoldingLike, 'quantity' | 'purchase_price'>): number =>
  h.quantity * h.purchase_price

export const gainLoss = (h: Pick<HoldingLike, 'quantity' | 'purchase_price' | 'current_value'>): number =>
  h.current_value - costBasis(h)

export function gainLossPct(h: Pick<HoldingLike, 'quantity' | 'purchase_price' | 'current_value'>): number {
  const basis = costBasis(h)
  return basis > 0 ? round1((gainLoss(h) / basis) * 100) : 0
}

export interface PortfolioTotals {
  totalValue: number
  totalCostBasis: number
  totalGainLoss: number
  totalGainLossPct: number
}

export function portfolioTotals(holdings: HoldingLike[]): PortfolioTotals {
  const totalValue = holdings.reduce((s, h) => s + h.current_value, 0)
  const totalCostBasis = holdings.reduce((s, h) => s + costBasis(h), 0)
  const totalGainLoss = totalValue - totalCostBasis
  return {
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPct: totalCostBasis > 0 ? round1((totalGainLoss / totalCostBasis) * 100) : 0,
  }
}

export interface AllocationSlice {
  assetClass: AssetClass
  value: number
  pct: number
}

export function allocation(holdings: HoldingLike[]): AllocationSlice[] {
  const total = holdings.reduce((s, h) => s + h.current_value, 0)
  if (total === 0) return []
  const byClass = new Map<AssetClass, number>()
  for (const h of holdings) byClass.set(h.asset_class, (byClass.get(h.asset_class) ?? 0) + h.current_value)
  return [...byClass.entries()]
    .map(([assetClass, value]) => ({ assetClass, value, pct: round1((value / total) * 100) }))
    .sort((a, b) => b.value - a.value)
}

export interface HoldingGroup<H extends HoldingLike> {
  assetClass: AssetClass
  holdings: H[]
  total: number
}

const CLASS_ORDER: AssetClass[] = ['IDX_STOCK', 'US_STOCK', 'MUTUAL_FUND', 'ETF', 'BOND', 'OTHER']

/** Holdings grouped by class in CLASS_ORDER, empty classes omitted, input order kept within a class. */
export function groupHoldingsByClass<H extends HoldingLike>(holdings: H[]): HoldingGroup<H>[] {
  const buckets = new Map<AssetClass, H[]>(CLASS_ORDER.map((c) => [c, []]))
  for (const h of holdings) buckets.get(h.asset_class)!.push(h)
  return CLASS_ORDER
    .map((assetClass) => {
      const list = buckets.get(assetClass)!
      return { assetClass, holdings: list, total: list.reduce((s, h) => s + h.current_value, 0) }
    })
    .filter((g) => g.holdings.length > 0)
}

import { SUPPORTED_CURRENCIES } from '@/lib/exchange-rate'

const ASSET_CLASSES: AssetClass[] = ['IDX_STOCK', 'US_STOCK', 'MUTUAL_FUND', 'ETF', 'BOND', 'OTHER']

export interface SanitizedHolding {
  asset_class: AssetClass
  symbol: string | null
  name: string
  quantity: number
  purchase_price: number
  current_value: number
  purchase_date: string | null
  currency: string
}

export type HoldingPayloadResult =
  | { ok: true; data: SanitizedHolding | Partial<SanitizedHolding> }
  | { ok: false; error: string }

const trimOrNull = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null

const posNumber = (v: unknown, field: string, allowZero: boolean): number => {
  const n = Number(v)
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) {
    throw new Error(`${field} must be a ${allowZero ? 'non-negative' : 'positive'} number`)
  }
  return n
}

/** Validates a holding create (full) or update (partial) payload. account_id is never accepted. */
export function sanitizeHoldingPayload(
  body: Record<string, unknown>,
  opts: { partial?: boolean } = {}
): HoldingPayloadResult {
  try {
    if ('account_id' in body) return { ok: false, error: 'account_id cannot be changed' }
    const out: Partial<SanitizedHolding> = {}
    const has = (k: string) => body[k] !== undefined
    const require = (k: string) => !opts.partial || has(k)

    if (require('asset_class')) {
      const ac = String(body.asset_class ?? '').toUpperCase()
      if (!ASSET_CLASSES.includes(ac as AssetClass)) return { ok: false, error: 'invalid asset_class' }
      out.asset_class = ac as AssetClass
    }
    if (require('name')) {
      const name = trimOrNull(body.name)
      if (!name) return { ok: false, error: 'name is required' }
      out.name = name
    }
    if (require('quantity')) out.quantity = posNumber(body.quantity, 'quantity', false)
    if (require('purchase_price')) out.purchase_price = posNumber(body.purchase_price, 'purchase_price', true)
    if (require('current_value')) out.current_value = posNumber(body.current_value, 'current_value', true)
    if (require('currency')) {
      const cur = trimOrNull(body.currency)?.toUpperCase() ?? 'IDR'
      if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(cur)) return { ok: false, error: 'unsupported currency' }
      out.currency = cur
    }
    if (has('symbol') || !opts.partial) out.symbol = trimOrNull(body.symbol)
    if (has('purchase_date') || !opts.partial) out.purchase_date = trimOrNull(body.purchase_date)

    return { ok: true, data: out as SanitizedHolding }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'invalid payload' }
  }
}
