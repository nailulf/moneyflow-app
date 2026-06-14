import type { Transaction } from '@/types/database'

export type TransactionTypeFilter = 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'

export interface TransactionFilters {
  type: TransactionTypeFilter
  month: { year: number; month: number } // month is 0-11
  search: string
  categoryIds: string[]
  accountIds: string[]
  amountMin?: number
  amountMax?: number
}

export function filterTransactions(txns: Transaction[], f: TransactionFilters): Transaction[] {
  const q = f.search.trim().toLowerCase()
  return txns.filter((t) => {
    if (f.type !== 'ALL' && t.type !== f.type) return false
    const tyear = Number(t.date.slice(0, 4))
    const tmonth = Number(t.date.slice(5, 7)) - 1 // 0-11, from the YYYY-MM-DD string (timezone-proof)
    if (tyear !== f.month.year || tmonth !== f.month.month) return false
    if (q) {
      const hay = `${t.merchant ?? ''} ${t.description ?? ''} ${t.notes ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (f.categoryIds.length && (!t.category_id || !f.categoryIds.includes(t.category_id))) return false
    if (f.accountIds.length) {
      const inAccount =
        (t.account_id != null && f.accountIds.includes(t.account_id)) ||
        (t.to_account_id != null && f.accountIds.includes(t.to_account_id))
      if (!inAccount) return false
    }
    const mag = Math.abs(t.amount)
    if (f.amountMin != null && mag < f.amountMin) return false
    if (f.amountMax != null && mag > f.amountMax) return false
    return true
  })
}

export interface TransactionGroup {
  dateKey: string // YYYY-MM-DD
  items: Transaction[]
}

/**
 * Groups transactions by calendar day (YYYY-MM-DD), newest day first.
 * Within a day, items keep their input order (the caller controls intra-day ordering).
 */
export function groupByDate(txns: Transaction[]): TransactionGroup[] {
  const sorted = [...txns].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const map = new Map<string, Transaction[]>()
  for (const t of sorted) {
    const key = t.date.slice(0, 10)
    const bucket = map.get(key)
    if (bucket) bucket.push(t)
    else map.set(key, [t])
  }
  return Array.from(map.entries()).map(([dateKey, items]) => ({ dateKey, items }))
}

export function summarize(txns: Transaction[]): { income: number; expense: number } {
  let income = 0
  let expense = 0
  for (const t of txns) {
    if (t.type === 'INCOME') income += Math.abs(t.amount)
    else if (t.type === 'EXPENSE') expense += Math.abs(t.amount)
  }
  return { income, expense }
}

/** Returns 'today' | 'yesterday' | null for a YYYY-MM-DD key relative to a reference YYYY-MM-DD. */
export function relativeDayLabel(dateKey: string, todayKey: string): 'today' | 'yesterday' | null {
  if (dateKey === todayKey) return 'today'
  const d = new Date(todayKey + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const y = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return dateKey === y ? 'yesterday' : null
}
