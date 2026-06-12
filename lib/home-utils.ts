import type { Transaction } from '@/types/database'

// ---------- greeting ----------

export type GreetingKey = 'morning' | 'afternoon' | 'evening'

export function getGreetingKey(hour: number): GreetingKey {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

// ---------- today summary ----------

export interface TodaySummary {
  spent: number
  count: number
}

/** todayISO is a YYYY-MM-DD string; counts all of today's transactions, sums |EXPENSE|. */
export function summarizeToday(transactions: Transaction[], todayISO: string): TodaySummary {
  const todays = transactions.filter((t) => t.date === todayISO)
  const spent = todays
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  return { spent, count: todays.length }
}

// ---------- biggest expenses ----------

export function topExpenses(
  transactions: Transaction[],
  year: number,
  month: number, // 1-based
  n: number
): Transaction[] {
  return transactions
    .filter((t) => {
      if (t.type !== 'EXPENSE') return false
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, n)
}

// ---------- monthly buckets ----------

export interface MonthBucket {
  year: number
  month: number // 1-based
  total: number
}

/** Last `months` calendar months including the current one, oldest first. */
export function monthlySpending(transactions: Transaction[], months: number, now: Date): MonthBucket[] {
  const buckets: MonthBucket[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ year: d.getFullYear(), month: d.getMonth() + 1, total: 0 })
  }
  for (const t of transactions) {
    if (t.type !== 'EXPENSE') continue
    const d = new Date(t.date)
    const b = buckets.find((x) => x.year === d.getFullYear() && x.month === d.getMonth() + 1)
    if (b) b.total += Math.abs(t.amount)
  }
  return buckets
}

export interface MonthPoint {
  year: number
  month: number // 1-based
  value: number
}

/** Last net-worth point of each month, at most `n` months, oldest first. */
export function monthlyNetWorthPoints(
  data: Array<{ date: string; value: number }>,
  n: number
): MonthPoint[] {
  const byMonth = new Map<string, MonthPoint>()
  for (const p of [...data].sort((a, b) => a.date.localeCompare(b.date))) {
    const d = new Date(p.date)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    byMonth.set(key, { year: d.getFullYear(), month: d.getMonth() + 1, value: p.value })
  }
  return [...byMonth.values()].slice(-n)
}

// ---------- assets / liabilities ----------

interface AccountLike {
  id: string
  name: string
  type: string
  balance: number
  currentBalance?: number
  currency: string
}

export interface AccountSplit<A extends AccountLike> {
  assets: A[]
  liabilities: A[]
  assetsTotal: number
  liabilitiesTotal: number
}

const LIABILITY_TYPES = new Set(['CREDIT_CARD', 'MORTGAGE'])

const effectiveBalance = (a: AccountLike) => a.currentBalance ?? a.balance

/** Liability ⇔ liability-typed account or negative balance (mirrors NetWorthOverview intent). */
export function splitAccounts<A extends AccountLike>(accounts: A[]): AccountSplit<A> {
  const assets: A[] = []
  const liabilities: A[] = []
  for (const a of accounts) {
    if (LIABILITY_TYPES.has(a.type) || effectiveBalance(a) < 0) liabilities.push(a)
    else assets.push(a)
  }
  return {
    assets,
    liabilities,
    assetsTotal: assets.reduce((s, a) => s + effectiveBalance(a), 0),
    liabilitiesTotal: liabilities.reduce((s, a) => s + Math.abs(effectiveBalance(a)), 0),
  }
}

// ---------- upcoming recurring ----------

const daysInMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate()

/** Next occurrence strictly after `today`, or null (not recurring / past end date). */
export function projectNextOccurrence(t: Transaction, today: Date): Date | null {
  if (!t.is_recurring || !t.recurring_frequency) return null
  const origin = new Date(t.date)
  const startOfTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  let next: Date

  switch (t.recurring_frequency) {
    case 'daily':
      next = startOfTomorrow
      break
    case 'weekly': {
      const delta = (origin.getDay() - startOfTomorrow.getDay() + 7) % 7
      next = new Date(startOfTomorrow)
      next.setDate(next.getDate() + delta)
      break
    }
    case 'monthly': {
      const y = today.getFullYear()
      const m = today.getMonth()
      const dayThisMonth = Math.min(origin.getDate(), daysInMonth(y, m))
      next = new Date(y, m, dayThisMonth)
      if (next < startOfTomorrow) {
        next = new Date(y, m + 1, Math.min(origin.getDate(), daysInMonth(y, m + 1)))
      }
      break
    }
    case 'yearly': {
      const y = today.getFullYear()
      const candidate = new Date(y, origin.getMonth(), Math.min(origin.getDate(), daysInMonth(y, origin.getMonth())))
      next = candidate < startOfTomorrow
        ? new Date(y + 1, origin.getMonth(), Math.min(origin.getDate(), daysInMonth(y + 1, origin.getMonth())))
        : candidate
      break
    }
    default:
      return null
  }

  if (t.recurring_end_date && next > new Date(t.recurring_end_date)) return null
  return next
}

export interface UpcomingItem {
  transaction: Transaction
  date: Date
}

/** Soonest-first next occurrences within `horizonDays`, capped at `max`. */
export function upcomingRecurring(
  transactions: Transaction[],
  today: Date,
  horizonDays: number,
  max: number
): UpcomingItem[] {
  const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + horizonDays)
  return transactions
    .map((t) => ({ transaction: t, date: projectNextOccurrence(t, today) }))
    .filter((x): x is UpcomingItem => x.date !== null && x.date <= horizon)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, max)
}
