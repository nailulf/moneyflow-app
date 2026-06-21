export interface BalancePoint {
  date: string
  balance: number
}

interface BuildArgs {
  initialBalance: number
  currentBalance: number
  createdAt: string | null
  accountId: string
  transactions: Array<{
    type: string
    amount: number
    date: string
    account_id: string | null
    to_account_id: string | null
  }>
}

/**
 * Ported from AccountDetailView: anchors to the opening balance at creation,
 * walks every transaction's effect chronologically, and pins the final point to
 * the API-computed current balance. Adjustment edits are real transactions in
 * `transactions`, so they're already counted — never add the audit log on top.
 */
export function buildBalanceHistory({
  initialBalance,
  currentBalance,
  createdAt,
  accountId,
  transactions,
}: BuildArgs): BalancePoint[] {
  const dateEffects = new Map<string, number>()
  transactions.forEach((tx) => {
    let effect = 0
    if (tx.type === 'INCOME') effect = tx.amount
    else if (tx.type === 'EXPENSE') effect = -tx.amount
    else if (tx.type === 'TRANSFER' && tx.to_account_id) {
      if (tx.account_id === accountId) effect = -tx.amount
      else if (tx.to_account_id === accountId) effect = tx.amount
    }
    if (effect !== 0) {
      dateEffects.set(tx.date, (dateEffects.get(tx.date) || 0) + effect)
    }
  })

  const sortedDates = [...dateEffects.keys()].sort()
  const today = new Date().toISOString().slice(0, 10)
  const created = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : null

  if (sortedDates.length === 0) {
    if (created) {
      return [
        { date: created, balance: initialBalance },
        { date: today, balance: currentBalance },
      ]
    }
    return []
  }

  let balance = initialBalance
  const points: BalancePoint[] = []
  const startDate = created ?? sortedDates[0]
  if (startDate) points.push({ date: startDate, balance })

  sortedDates.forEach((date) => {
    balance += dateEffects.get(date)!
    points.push({ date, balance })
  })

  const lastDate = points[points.length - 1]?.date
  if (!lastDate || lastDate < today) {
    points.push({ date: today, balance: currentBalance })
  } else if (lastDate === today) {
    points[points.length - 1].balance = currentBalance
  }

  const deduped: BalancePoint[] = []
  for (let i = 0; i < points.length; i++) {
    const prev = deduped[deduped.length - 1]
    const next = points[i + 1]
    if (!prev || prev.date !== points[i].date || !next || next.date !== points[i].date) {
      deduped.push(points[i])
    }
  }
  return deduped
}

export function computeBalanceChangePercent(series: BalancePoint[]): number | null {
  if (series.length < 2) return null
  const first = series[0].balance
  const last = series[series.length - 1].balance
  if (first === 0) return null
  return Math.round(((last - first) / Math.abs(first)) * 100)
}
