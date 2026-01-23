import { Transaction } from '@/types/database'
import { CategoryData, MonthlyData, CATEGORY_COLORS, Category } from '@/types/app'
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'

// Default currency configuration
export const DEFAULT_CURRENCY = 'IDR'

// Currency formatting helper with support for multiple currencies
export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const currencySymbols: Record<string, string> = {
    'IDR': 'Rp',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥'
  }
  
  const symbol = currencySymbols[currency] || currency
  
  // Always show with 2 decimal places for all currencies including IDR
  const formattedAmount = Math.abs(amount).toFixed(2)
  
  // For IDR, use Indonesian locale formatting with thousand separators
  if (currency === 'IDR') {
    return `${symbol} ${parseFloat(formattedAmount).toLocaleString('id-ID', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }
  
  // For other currencies, use standard formatting
  return `${symbol}${formattedAmount}`
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