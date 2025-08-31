import { Transaction } from './database'

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
export type CategoryGroupType = 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CUSTOM'
export type CategoryGroup = 'EXPENSE' | 'INCOME' | 'TRANSFER' // Keep for backward compatibility

export interface Budget {
  budget_id: string
  id: string
  name: string
  amount: number
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  updatedAt: string
} 

// should be budget's item
export interface BudgetItem{
  id: string
  budget_id: string
  category_id: string
  allocated_amount: number
  spent_amount: number
  currency: string
  created_at: string
  updated_at: string
  category_name?: string
  category_color?: string
}

export interface CategoryGroupData {
  id: string
  name: string
  type: CategoryGroupType
  color: string
  icon?: string | null
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  categories: CategoryItem[]
}

export interface CategoryItem {
  id: string
  name: string // Changed from Category to string to support custom names
  color: string
  groupType: CategoryGroupType
  categoryGroupId?: string | null
  isCustom?: boolean
}

// Helper function to get budgets breakdown by budgetID
export function getBudgetItems(budgetItems: BudgetItem[], budgetID: string): BudgetItem[] {
  return budgetItems
    .filter(item => item.budget_id === budgetID)
}


// Helper function to get categories by group (updated for new structure)
export function getCategoriesByGroup(groups: CategoryGroupData[], groupType: CategoryGroupType): CategoryItem[] {
  return groups
    .filter(group => group.type === groupType && group.isActive)
    .flatMap(group => group.categories)
}

// Helper function to get default categories by legacy group type
export function getDefaultCategoriesByGroup(groupId: CategoryGroup): Category[] {
  if (groupId === 'INCOME') {
    return ['Income']
  }
  // Default app constants currently don't include transfer-specific names; UI will source user categories
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
export interface CashFlowBreakdownProps {
  transactions: Transaction[]
}
