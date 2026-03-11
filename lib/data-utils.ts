import { Transaction } from '@/types/database'
import { CategoryData, MonthlyData, CATEGORY_COLORS, Category } from '@/types/app'
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'

// Default currency configuration
export const DEFAULT_CURRENCY = 'IDR'

const CURRENCY_SYMBOLS: Record<string, string> = {
  'IDR': 'Rp',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'SGD': 'S$',
  'MYR': 'RM',
  'AED': 'Dhs',
  'SAR': 'SR',
}



/**
 * Parse a currency value from various string formats into a plain number.
 *
 * Handles:
 *   - Raw numeric strings:        "100000000000"  → 100000000000
 *   - IDR dot-thousands format:   "100.000.000"   → 100000000
 *   - US comma-thousands format:  "100,000,000"   → 100000000
 *   - Decimal amounts:            "100,000.50"    → 100000.5
 *   - Currency symbols/prefixes:  "Rp 100.000"    → 100000
 *   - Plain numbers:              100000000000    → 100000000000
 *
 * Returns 0 for empty, null, undefined, or unparseable input.
 */
export function parseCurrencyAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return isFinite(value) ? value : 0

  const trimmed = value.trim()
  if (!trimmed) return 0

  // Strip currency symbols and letters, keep digits, dots, commas, minus
  let s = trimmed.replace(/[^\d.,\-]/g, '')
  if (!s) return 0

  const dotCount = (s.match(/\./g) || []).length
  const commaCount = (s.match(/,/g) || []).length

  if (dotCount > 1) {
    // Multiple dots → all are thousands separators (IDR style: "100.000.000")
    s = s.replace(/\./g, '')
  } else if (commaCount > 1) {
    // Multiple commas → all are thousands separators ("100,000,000")
    s = s.replace(/,/g, '')
  } else if (dotCount === 1 && commaCount === 1) {
    const dotPos = s.indexOf('.')
    const commaPos = s.indexOf(',')
    if (dotPos < commaPos) {
      // "1.000,50" — dot is thousands, comma is decimal → "1000.50"
      s = s.replace('.', '').replace(',', '.')
    } else {
      // "1,000.50" — comma is thousands, dot is decimal → "1000.50"
      s = s.replace(',', '')
    }
  } else if (commaCount === 1) {
    const afterComma = s.split(',')[1]
    if (afterComma !== undefined && afterComma.length <= 2) {
      // Likely decimal separator ("100,50" or "100,5") → "100.50"
      s = s.replace(',', '.')
    } else {
      // Likely thousands separator ("1,000") → strip comma
      s = s.replace(',', '')
    }
  }
  // Single dot: already a valid float string ("100000.50")

  const result = parseFloat(s)
  return isNaN(result) ? 0 : result
}

// Currency formatting helper with support for multiple currencies
export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  const abs = Math.abs(amount)

  if (currency === 'IDR') {
    return `${symbol} ${abs.toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // All other currencies: en-US locale adds thousand separators and 2 decimal places
  return `${symbol}${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Compact currency formatter for small cards where full numbers don't fit.
 * Abbreviates by digit count — only use in constrained UI spaces.
 *
 * Thresholds (absolute value):
 *   < 10,000          → full number  e.g. Rp 9.500
 *   ≥ 10,000  (5 dig) → Rb/K        e.g. Rp 15Rb  / $15K
 *   ≥ 1,000,000 (7 d) → Jt/M        e.g. Rp 1.5Jt / $1.5M
 *   ≥ 1,000,000,000   → M/B         e.g. Rp 2M    / $2B
 */
export function formatCurrencyCompact(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const currencySymbols: Record<string, string> = {
    'IDR': 'Rp',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'AED': 'Dhs'
  }

  const symbol = currencySymbols[currency] || currency
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  const compact = (val: number, suffix: string) => {
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
    return currency === 'IDR'
      ? `${symbol} ${sign}${formatted}${suffix}`
      : `${symbol}${sign}${formatted}${suffix}`
  }

  if (currency === 'IDR') {
    if (abs >= 1_000_000_000) return compact(abs / 1_000_000_000, 'M')   // Miliar
    if (abs >= 1_000_000)     return compact(abs / 1_000_000, 'Jt')       // Juta
    if (abs >= 10_000)        return compact(abs / 1_000, 'Rb')            // Ribu
    return `${symbol} ${sign}${abs.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
  }

  if (abs >= 1_000_000_000) return compact(abs / 1_000_000_000, 'B')
  if (abs >= 1_000_000)     return compact(abs / 1_000_000, 'M')
  if (abs >= 10_000)        return compact(abs / 1_000, 'K')
  return `${symbol}${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'MMM dd, yyyy')
}

export function getCategoryBreakdown(transactions: Transaction[]): CategoryData[] {
  const expenses = transactions.filter(t => t.type === 'EXPENSE' && t.amount < 0)
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  
  const categoryTotals = expenses.reduce((acc, transaction) => {
    const category = (transaction.category_id || 'Other') as Category
    acc[category] = (acc[category] || 0) + Math.abs(transaction.amount)
    return acc
  }, {} as Record<Category, number>)

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category: category as Category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      color: CATEGORY_COLORS[category as Category] || 'hsl(var(--muted))'
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function getMonthlyData(transactions: Transaction[], months: number = 10): MonthlyData[] {
  const endDate = new Date()
  const startDate = subMonths(endDate, months - 1)
  
  const monthsArray = eachMonthOfInterval({ start: startDate, end: endDate })
  
  return monthsArray.map(month => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    
    const monthTransactions = transactions.filter(t => {
      const transactionDate = parseISO(t.date)
      return transactionDate >= monthStart && transactionDate <= monthEnd
    })
    
    const income = monthTransactions
      .filter(t => t.type === 'INCOME' && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expenses = Math.abs(monthTransactions
      .filter(t => t.type === 'EXPENSE' && t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0))
    
    return {
      month: format(month, 'MMM yyyy'),
      income,
      expenses,
      net: income - expenses
    }
  })
}

export function getTotalBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0)
}

export function getMonthlySpending(transactions: Transaction[], currentDate: Date = new Date()): number {
  const currentMonth = currentDate
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  
  return transactions
    .filter(t => {
      const transactionDate = parseISO(t.date)
      return transactionDate >= monthStart && transactionDate <= monthEnd && t.type === 'EXPENSE'
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

export function getMonthlyIncome(transactions: Transaction[], currentDate: Date = new Date()): number {
  const currentMonth = currentDate
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  
  return transactions
    .filter(t => {
      const transactionDate = parseISO(t.date)
      return transactionDate >= monthStart && transactionDate <= monthEnd && t.type === 'INCOME'
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

export function calculateTotalSpending(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

export function calculateTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}