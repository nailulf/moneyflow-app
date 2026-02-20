import { CategoryDB } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import {
  validateCategoryAddition,
  validateCategoryUpdate,
  validateCategoryRemoval,
  validateTotalAmountUpdate,
  validateBudgetAllocationState,
  SafeMath,
  roundToPrecision
} from './budget-validation'

// Constants for the "Others" category
export const OTHERS_CATEGORY = {
  id: 'others-category',
  name: 'Others',
  color: '#9CA3AF', // Gray color
  description: 'Unallocated budget amount'
} as const

// Budget category interface for allocation logic
export interface BudgetCategoryAllocation {
  id: string
  category_id: string
  category_name: string
  category_color: string
  allocated_amount: number
  spent_amount?: number
}

// Budget allocation state
export interface BudgetAllocationState {
  totalAmount: number
  categories: BudgetCategoryAllocation[]
  othersAmount: number
  currency: string
}

// Validation result
export interface AllocationValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Initialize budget allocation with "Others" category containing the full amount
 */
export function initializeBudgetAllocation(
  totalAmount: number,
  currency: string = 'USD'
): BudgetAllocationState {
  // Round total to proper precision
  const roundedTotal = roundToPrecision(totalAmount)
  
  // Validate inputs
  if (roundedTotal < 0) {
    throw new Error('Total amount cannot be negative')
  }
  
  return {
    totalAmount: roundedTotal,
    currency,
    categories: [],
    othersAmount: roundedTotal
  }
}

/**
 * Add a new category allocation and automatically adjust "Others" category
 */
export function addCategoryAllocation(
  state: BudgetAllocationState,
  categoryId: string,
  categoryName: string,
  categoryColor: string,
  allocatedAmount: number
): BudgetAllocationState {
  // Validate the operation
  const validation = validateCategoryAddition(state, categoryId, categoryName, categoryColor, allocatedAmount)
  if (!validation.isValid) {
    throw new Error(validation.errors[0]?.message || 'Invalid category addition')
  }
  
  // Round amount to proper precision
  const roundedAmount = roundToPrecision(allocatedAmount)
  
  // Create new category
  const newCategory: BudgetCategoryAllocation = {
    id: uuidv4(),
    category_id: categoryId,
    category_name: categoryName.trim(),
    category_color: categoryColor,
    allocated_amount: roundedAmount,
    spent_amount: 0
  }
  
  // Update state using safe math
  return {
    ...state,
    categories: [...state.categories, newCategory],
    othersAmount: SafeMath.subtract(state.othersAmount, roundedAmount)
  }
}

/**
 * Update an existing category allocation and rebalance "Others" category
 */
export function updateCategoryAllocation(
  state: BudgetAllocationState,
  categoryId: string,
  newAllocatedAmount: number
): BudgetAllocationState {
  // Validate the operation
  const validation = validateCategoryUpdate(state, categoryId, newAllocatedAmount)
  if (!validation.isValid) {
    throw new Error(validation.errors[0]?.message || 'Invalid category update')
  }
  
  // Find category
  const categoryIndex = state.categories.findIndex(cat => cat.category_id === categoryId)
  const category = state.categories[categoryIndex]
  
  // Round amount to proper precision
  const roundedAmount = roundToPrecision(newAllocatedAmount)
  const difference = SafeMath.subtract(roundedAmount, category.allocated_amount)
  
  // Update category
  const updatedCategories = [...state.categories]
  updatedCategories[categoryIndex] = {
    ...category,
    allocated_amount: roundedAmount
  }
  
  // Update state using safe math
  return {
    ...state,
    categories: updatedCategories,
    othersAmount: SafeMath.subtract(state.othersAmount, difference)
  }
}

/**
 * Remove a category allocation and return funds to "Others" category
 */
export function removeCategoryAllocation(
  state: BudgetAllocationState,
  categoryId: string
): BudgetAllocationState {
  // Validate the operation
  const validation = validateCategoryRemoval(state, categoryId)
  if (!validation.isValid) {
    throw new Error(validation.errors[0]?.message || 'Invalid category removal')
  }
  
  // Find category
  const category = state.categories.find(cat => cat.category_id === categoryId)!
  
  // Remove category and return amount to others using safe math
  return {
    ...state,
    categories: state.categories.filter(cat => cat.category_id !== categoryId),
    othersAmount: SafeMath.add(state.othersAmount, category.allocated_amount)
  }
}

/**
 * Update the total budget amount and redistribute proportionally
 */
export function updateTotalBudgetAmount(
  state: BudgetAllocationState,
  newTotalAmount: number
): BudgetAllocationState {
  // Validate the operation
  const validation = validateTotalAmountUpdate(state, newTotalAmount)
  if (!validation.isValid) {
    throw new Error(validation.errors[0]?.message || 'Invalid total amount update')
  }
  
  // Round total to proper precision
  const roundedTotal = roundToPrecision(newTotalAmount)
  
  // Calculate new others amount using safe math
  const currentAllocated = state.categories.reduce((sum, cat) => SafeMath.add(sum, cat.allocated_amount), 0)
  const newOthersAmount = SafeMath.subtract(roundedTotal, currentAllocated)
  
  return {
    ...state,
    totalAmount: roundedTotal,
    othersAmount: newOthersAmount
  }
}

/**
 * Validate the current budget allocation state
 */
export function validateBudgetAllocation(state: BudgetAllocationState): AllocationValidationResult {
  // Use comprehensive validation from budget-validation module
  const validation = validateBudgetAllocationState(state)
  
  return {
    isValid: validation.isValid,
    errors: validation.errors.map(error => error.message),
    warnings: validation.warnings.map(warning => warning.message)
  }
}

/**
 * Get the complete budget allocation including "Others" category
 */
export function getCompleteBudgetAllocation(state: BudgetAllocationState): BudgetCategoryAllocation[] {
  const allocations = [...state.categories]
  
  // Add "Others" category if it has any amount
  if (state.othersAmount > 0) {
    allocations.push({
      id: `allocation-${OTHERS_CATEGORY.id}`,
      category_id: OTHERS_CATEGORY.id,
      category_name: OTHERS_CATEGORY.name,
      category_color: OTHERS_CATEGORY.color,
      allocated_amount: state.othersAmount,
      spent_amount: 0
    })
  }
  
  return allocations
}

/**
 * Convert from existing budget data to allocation state
 */
export function fromExistingBudgetData(
  totalAmount: number,
  categories: Array<{
    category_id: string
    category_name: string
    category_color: string
    allocated_amount: number
    spent_amount?: number
  }>,
  currency: string = 'USD'
): BudgetAllocationState {
  const allocatedTotal = categories.reduce((sum, cat) => sum + cat.allocated_amount, 0)
  const othersAmount = Math.max(0, Math.round((totalAmount - allocatedTotal) * 100) / 100)
  
  const budgetCategories: BudgetCategoryAllocation[] = categories
    .filter(cat => cat.category_id !== OTHERS_CATEGORY.id) // Exclude Others if it exists
    .map(cat => ({
      id: `allocation-${cat.category_id}-${Date.now()}`,
      category_id: cat.category_id,
      category_name: cat.category_name,
      category_color: cat.category_color,
      allocated_amount: Math.round(cat.allocated_amount * 100) / 100,
      spent_amount: cat.spent_amount || 0
    }))
  
  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    categories: budgetCategories,
    othersAmount,
    currency
  }
}

/**
 * Convert allocation state to database format
 */
export function toDatabase(state: BudgetAllocationState): Array<{
  category_id: string
  allocated_amount: number
}> {
  const dbCategories = state.categories.map(cat => ({
    category_id: cat.category_id,
    allocated_amount: cat.allocated_amount
  }))
  
  // Add Others category if it has any amount
  if (state.othersAmount > 0) {
    dbCategories.push({
      category_id: OTHERS_CATEGORY.id,
      allocated_amount: state.othersAmount
    })
  }
  
  return dbCategories
}