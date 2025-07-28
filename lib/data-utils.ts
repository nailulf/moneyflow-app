import { Transaction } from '@/types/database'
import { CategoryData, MonthlyData, CATEGORY_COLORS, Category } from '@/types/app'
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount))
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'MMM dd, yyyy')
}

export function getCategoryBreakdown(transactions: Transaction[]): CategoryData[] {
  const expenses = transactions.filter(t => t.amount < 0)
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  
  const categoryTotals = expenses.reduce((acc, transaction) => {
    const category = transaction.category as Category
    acc[category] = (acc[category] || 0) + Math.abs(transaction.amount)
    return acc
  }, {} as Record<Category, number>)

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category: category as Category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      color: CATEGORY_COLORS[category as Category] || '#AED6F1'
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function getMonthlyData(transactions: Transaction[], months: number = 6): MonthlyData[] {
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
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expenses = Math.abs(monthTransactions
      .filter(t => t.amount < 0)
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

export function getMonthlySpending(transactions: Transaction[]): number {
  const currentMonth = new Date()
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  
  return Math.abs(transactions
    .filter(t => {
      const transactionDate = parseISO(t.date)
      return transactionDate >= monthStart && transactionDate <= monthEnd && t.amount < 0
    })
    .reduce((sum, t) => sum + t.amount, 0))
}

export function getMonthlyIncome(transactions: Transaction[]): number {
  const currentMonth = new Date()
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  
  return transactions
    .filter(t => {
      const transactionDate = parseISO(t.date)
      return transactionDate >= monthStart && transactionDate <= monthEnd && t.amount > 0
    })
    .reduce((sum, t) => sum + t.amount, 0)
}