export const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Income',
  'Other'
] as const

export type Category = typeof CATEGORIES[number]

// Category Group Types for new CategoryManager
export type CategoryGroup = 'EXPENSE' | 'INCOME'

export interface CategoryGroupData {
  id: CategoryGroup
  name: string
  categories: CategoryItem[]
}

export interface CategoryItem {
  id: string
  name: Category
  color: string
  group: CategoryGroup
  isCustom?: boolean
}

// Helper function to get categories by group
export function getCategoriesByGroup(groupId: CategoryGroup): Category[] {
  if (groupId === 'INCOME') {
    return ['Income']
  }
  return CATEGORIES.filter(cat => cat !== 'Income')
}

export interface TransactionSummary {
  totalAmount: number
  transactionCount: number
  categoryBreakdown: Record<Category, number>
  monthlyTrend: Array<{
    month: string
    amount: number
  }>
}

export interface FileProcessingResult {
  success: boolean
  transactions: any[]
  errors: string[]
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
  net: number
}

export interface CategoryData {
  category: Category
  amount: number
  percentage: number
  color: string
}

export const CATEGORY_COLORS: Record<Category, string> = {
  'Food & Dining': '#FF6B6B',
  'Transportation': '#4ECDC4',
  'Shopping': '#45B7D1',
  'Entertainment': '#96CEB4',
  'Bills & Utilities': '#FFEAA7',
  'Healthcare': '#DDA0DD',
  'Education': '#98D8C8',
  'Travel': '#F7DC6F',
  'Income': '#82E0AA',
  'Other': '#AED6F1'
}