// lib/account-balance.ts
// Single source of truth for account balance math.
// Live balance = opening anchor + Σ(transaction effects), transfer- and currency-aware.

export type LedgerTxn = {
  /** Non-negative magnitude. Direction is derived from `type` (and `account_id` for transfers), never the sign. */
  amount: number
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  /** ISO date string (YYYY-MM-DD). Compared against `asOf` as a UTC instant. */
  date: string
  account_id: string | null
  to_account_id?: string | null
  currency?: string | null
}

/** Effect of a single transaction on a given account, before currency conversion. */
export function transactionEffect(t: LedgerTxn, accountId: string): number {
  switch (t.type) {
    case 'INCOME':
      return t.account_id === accountId ? t.amount : 0
    case 'EXPENSE':
      return t.account_id === accountId ? -t.amount : 0
    case 'TRANSFER':
      if (!t.to_account_id) return 0 // legacy transfer: direction unknown
      if (t.account_id === accountId) return -t.amount // source out
      if (t.to_account_id === accountId) return t.amount // destination in
      return 0
    default:
      return 0
  }
}

export interface ComputeBalanceArgs {
  accountId: string
  opening: number
  transactions: LedgerTxn[]
  asOf?: Date
  /** account currency; when set, foreign-currency tx are converted via currencyRates */
  accountCurrency?: string
  /** map of "FROM-TO" → rate */
  currencyRates?: Map<string, number>
}

function convert(amount: number, txCurrency: string | null | undefined, accountCurrency?: string, rates?: Map<string, number>): number {
  if (!accountCurrency || !rates || !txCurrency || txCurrency === accountCurrency) return amount
  const rate = rates.get(`${txCurrency}-${accountCurrency}`)
  return rate ? amount * rate : amount
}

/**
 * current balance = opening + Σ(converted effects of transactions on/before asOf).
 * Note: `asOf` is compared as a UTC instant against each transaction's date; pass UTC-midnight
 * dates (e.g. `new Date('2026-01-31')`) to keep day-boundary filtering predictable.
 */
export function computeAccountBalance({ accountId, opening, transactions, asOf, accountCurrency, currencyRates }: ComputeBalanceArgs): number {
  let balance = opening
  for (const t of transactions) {
    if (asOf && new Date(t.date) > asOf) continue
    const raw = transactionEffect(t, accountId)
    if (raw === 0) continue
    // convert by magnitude, preserving sign
    const converted = convert(Math.abs(raw), t.currency, accountCurrency, currencyRates)
    balance += raw < 0 ? -converted : converted
  }
  return balance
}
