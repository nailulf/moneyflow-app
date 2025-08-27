import { Transaction } from '@/types/database'
import { CATEGORY_COLORS } from '@/types/app'
import { parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

// Budget status type
export type BudgetStatus = 'good' | 'warning' | 'over'

// Budget category with calculated spending
export interface BudgetCategoryWithSpending {
  id: string
  category: string
  budgetAmount: number
  spentAmount: number
  status: BudgetStatus
  color: string
}

// Transformed budget for display
export interface TransformedBudget {
  id: string
  name: string
  totalAmount: number
  period: 'monthly' | 'yearly'
  categories: BudgetCategoryWithSpending[]
}

/**
 * Calculate budget status based on spending percentage
 */
export function calculateBudgetStatus(spent: number, budget: number): BudgetStatus {
  const percentage = budget > 0 ? (spent / budget) * 100 : 0
  if (percentage > 100) return 'over'
  if (percentage > 80) return 'warning'
  return 'good'
}

/**
 * Calculate actual spending for a specific category
 */
export function calculateCategorySpending(
  transactions: Transaction[],
  categoryId: string
): number {
  return transactions
    .filter(t => t.category_id === categoryId && t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

/**
 * Get category color (custom or predefined)
 */
export function getBudgetCategoryColor(
  categoryName: string,
  customColor?: string
): string {
  const isCustomCategory = !Object.keys(CATEGORY_COLORS).includes(categoryName)
  return isCustomCategory 
    ? (customColor || '#6B7280')
    : CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS] || '#AED6F1'
}

/**
 * Filter transactions by date range based on time period
 */
export function getTransactionsByDateRange(
  transactions: Transaction[],
  timeRange: 'monthly' | 'yearly',
  year: number,
  month?: number
): Transaction[] {
  let startDate: Date
  let endDate: Date

  if (timeRange === 'monthly' && month) {
    startDate = startOfMonth(new Date(year, month - 1))
    endDate = endOfMonth(new Date(year, month - 1))
  } else {
    startDate = startOfYear(new Date(year, 0))
    endDate = endOfYear(new Date(year, 0))
  }

  return transactions.filter(transaction => {
    const transactionDate = parseISO(transaction.date)
    return transactionDate >= startDate && transactionDate <= endDate
  })
}

// Budget interface for API responses
interface BudgetCategory {
  id: string
  allocated_amount: number
  spent_amount: number
  category: {
    id: string
    name: string
    color: string
  } | null
}

interface Budget {
  id: string
  name: string
  total_amount: number
  period: 'monthly' | 'yearly'
  budget_categories: BudgetCategory[]
}

/**
 * Transform budget data with actual spending calculations
 */
export function transformBudgetWithSpending(
  budget: Budget,
  transactions: Transaction[]
): TransformedBudget {
  const categoriesWithActualSpending = budget.budget_categories
    .filter((cat: BudgetCategory) => cat.category) // Filter out categories without category data
    .map((cat: BudgetCategory) => {
      const actualSpent = calculateCategorySpending(transactions, cat.category?.id || '')
      
      return {
        id: cat.id,
        category: cat.category?.name || 'Unknown Category',
        budgetAmount: cat.allocated_amount,
        spentAmount: actualSpent,
        status: calculateBudgetStatus(actualSpent, cat.allocated_amount),
        color: getBudgetCategoryColor(cat.category?.name || '', cat.category?.color)
      }
    })

  return {
    id: budget.id,
    name: budget.name,
    totalAmount: budget.total_amount,
    period: budget.period,
    categories: categoriesWithActualSpending
  }
}

/**
 * Calculate total budget progress
 */
export function calculateBudgetProgress(
  totalSpent: number,
  totalBudget: number
): number {
  return totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
}

/**
 * Calculate total spent amount from budget categories
 */
export function calculateTotalSpent(categories: BudgetCategoryWithSpending[]): number {
  return categories.reduce((sum, cat) => sum + cat.spentAmount, 0)
}

/**
 * Sort budget categories (custom categories first, then alphabetically)
 */
export function sortBudgetCategories(categories: BudgetCategory[]): BudgetCategory[] {
  return categories.sort((a: BudgetCategory, b: BudgetCategory) => {
    const aIsCustom = !Object.keys(CATEGORY_COLORS).includes(a.category?.name || '')
    const bIsCustom = !Object.keys(CATEGORY_COLORS).includes(b.category?.name || '')
    if (aIsCustom && !bIsCustom) return -1
    if (!aIsCustom && bIsCustom) return 1
    return (a.category?.name || '').localeCompare(b.category?.name || '')
  })
}