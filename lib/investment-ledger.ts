const TXN_TYPES = ['BUY', 'SELL', 'DIVIDEND'] as const
export type InvestmentTxnType = (typeof TXN_TYPES)[number]

const SUPPORTED_CURRENCIES = ['IDR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'AED', 'SAR'] as const

export interface LedgerTxn {
  type: InvestmentTxnType
  quantity: number
  price_per_unit: number
}

export interface HoldingAggregate {
  quantity: number
  averageCost: number
  bookValue: number
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/** Mirror of the SQL recompute_holding(): qty = Σbuy − Σsell, avg = Σ(buy.qty·price)/Σbuy.qty. */
export function recomputeFromLedger(txns: LedgerTxn[]): HoldingAggregate {
  let buyQty = 0
  let buyCost = 0
  let sellQty = 0
  for (const t of txns) {
    if (t.type === 'BUY') {
      buyQty += t.quantity
      buyCost += t.quantity * t.price_per_unit
    } else if (t.type === 'SELL') {
      sellQty += t.quantity
    }
  }
  const averageCost = buyQty > 0 ? buyCost / buyQty : 0
  const quantity = buyQty - sellQty
  return { quantity, averageCost, bookValue: round2(Math.max(0, quantity) * averageCost) }
}

/** Realized P/L on a sale: proceeds − cost basis of the units sold. */
export function realizedPl(sellQty: number, avgCost: number, proceeds: number): number {
  return round2(proceeds - sellQty * avgCost)
}

export type SanitizedTxn = {
  type: InvestmentTxnType
  quantity: number
  price_per_unit: number
  total_amount: number
  transaction_date: string
  currency: string
  notes: string | null
  cash_account_id: string | null
}

export type TxnPayloadResult =
  | { ok: true; data: SanitizedTxn | Partial<SanitizedTxn> }
  | { ok: false; error: string }

const FORBIDDEN_KEYS = ['account_id', 'user_id', 'holding_id', 'id', 'realized_pl']
const trimOrNull = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null
const posNumber = (v: unknown, field: string, allowZero: boolean): number => {
  const n = Number(v)
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) {
    throw new Error(`${field} must be a ${allowZero ? 'non-negative' : 'positive'} number`)
  }
  return n
}

/** Validates a transaction create (full) or update (partial) payload. */
export function sanitizeTxnPayload(
  body: Record<string, unknown>,
  opts: { partial?: boolean } = {}
): TxnPayloadResult {
  try {
    for (const k of FORBIDDEN_KEYS) {
      if (k in body) return { ok: false, error: `${k} cannot be set` }
    }
    const out: Partial<SanitizedTxn> = {}
    const has = (k: string) => body[k] !== undefined
    const require = (k: string) => !opts.partial || has(k)

    if (require('type')) {
      const t = String(body.type ?? '').toUpperCase()
      if (!(TXN_TYPES as readonly string[]).includes(t)) return { ok: false, error: 'invalid type' }
      out.type = t as InvestmentTxnType
    }
    if (require('quantity')) out.quantity = posNumber(body.quantity, 'quantity', false)
    if (require('price_per_unit')) out.price_per_unit = posNumber(body.price_per_unit, 'price_per_unit', true)
    if (require('transaction_date')) {
      const d = trimOrNull(body.transaction_date)
      if (!d) return { ok: false, error: 'transaction_date is required' }
      out.transaction_date = d
    }
    if (require('currency')) {
      const cur = trimOrNull(body.currency)?.toUpperCase() ?? 'IDR'
      if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(cur)) return { ok: false, error: 'unsupported currency' }
      out.currency = cur
    }
    if (has('total_amount')) {
      out.total_amount = posNumber(body.total_amount, 'total_amount', true)
    } else if (out.quantity !== undefined && out.price_per_unit !== undefined) {
      out.total_amount = round2(out.quantity * out.price_per_unit)
    }
    if (has('notes') || !opts.partial) out.notes = trimOrNull(body.notes)
    if (has('cash_account_id') || !opts.partial) out.cash_account_id = trimOrNull(body.cash_account_id)

    return { ok: true, data: out as SanitizedTxn }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'invalid payload' }
  }
}
