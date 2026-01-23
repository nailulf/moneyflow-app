/**
 * Budget Validation Utilities
 * Provides comprehensive validation safeguards for budget allocation operations
 */

import { BudgetAllocationState, BudgetCategoryAllocation } from './budget-allocation'

// Precision constants for floating point calculations
const DECIMAL_PRECISION = 2
const EPSILON = 0.01 // Tolerance for floating point comparisons

// Validation error types
export enum ValidationErrorType {
  NEGATIVE_AMOUNT = 'NEGATIVE_AMOUNT',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_TOTAL = 'INVALID_TOTAL',
  PRECISION_ERROR = 'PRECISION_ERROR',
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  CATEGORY_ALREADY_EXISTS = 'CATEGORY_ALREADY_EXISTS',
  INVALID_CURRENCY = 'INVALID_CURRENCY',
  MATHEMATICAL_INCONSISTENCY = 'MATHEMATICAL_INCONSISTENCY'
}

// Validation error interface
export interface ValidationError {
  type: ValidationErrorType
  message: string
  field?: string
  value?: number
  expected?: number
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

/**
 * Rounds a number to the specified decimal precision
 */
export function roundToPrecision(value: number, precision: number = DECIMAL_PRECISION): number {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

/**
 * Checks if two numbers are equal within epsilon tolerance
 */
export function isEqual(a: number, b: number, epsilon: number = EPSILON): boolean {
  return Math.abs(a - b) < epsilon
}

/**
 * Validates that an amount is non-negative
 */
export function validateNonNegativeAmount(amount: number, fieldName: string = 'amount'): ValidationError | null {
  if (amount < 0) {
    return {
      type: ValidationErrorType.NEGATIVE_AMOUNT,
      message: `${fieldName} cannot be negative`,
      field: fieldName,
      value: amount
    }
  }
  return null
}

/**
 * Validates that an amount has proper precision
 */
export function validateAmountPrecision(amount: number, fieldName: string = 'amount'): ValidationError | null {
  const rounded = roundToPrecision(amount)
  if (!isEqual(amount, rounded)) {
    return {
      type: ValidationErrorType.PRECISION_ERROR,
      message: `${fieldName} has too many decimal places (max ${DECIMAL_PRECISION})`,
      field: fieldName,
      value: amount,
      expected: rounded
    }
  }
  return null
}

/**
 * Validates that a total budget amount is valid
 */
export function validateTotalBudgetAmount(amount: number): ValidationError[] {
  const errors: ValidationError[] = []
  
  const negativeError = validateNonNegativeAmount(amount, 'totalAmount')
  if (negativeError) errors.push(negativeError)
  
  const precisionError = validateAmountPrecision(amount, 'totalAmount')
  if (precisionError) errors.push(precisionError)
  
  if (amount === 0) {
    errors.push({
      type: ValidationErrorType.INVALID_TOTAL,
      message: 'Total budget amount must be greater than zero',
      field: 'totalAmount',
      value: amount
    })
  }
  
  return errors
}

/**
 * Validates that sufficient funds are available for an allocation
 */
export function validateSufficientFunds(
  requestedAmount: number,
  availableAmount: number,
  operation: string = 'allocation'
): ValidationError | null {
  if (requestedAmount > availableAmount + EPSILON) {
    return {
      type: ValidationErrorType.INSUFFICIENT_FUNDS,
      message: `Insufficient funds for ${operation}. Available: ${availableAmount}, Requested: ${requestedAmount}`,
      value: requestedAmount,
      expected: availableAmount
    }
  }
  return null
}

/**
 * Validates currency code format
 */
export function validateCurrency(currency: string): ValidationError | null {
  if (!currency || currency.length !== 3 || !/^[A-Z]{3}$/.test(currency)) {
    return {
      type: ValidationErrorType.INVALID_CURRENCY,
      message: 'Currency must be a valid 3-letter ISO code (e.g., USD, EUR)',
      field: 'currency',
      value: currency as any
    }
  }
  return null
}

/**
 * Validates mathematical consistency of budget allocation
 */
export function validateMathematicalConsistency(
  totalAmount: number,
  categories: BudgetCategoryAllocation[],
  othersAmount: number
): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Calculate total allocated across all categories
  const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocated_amount, 0)
  const calculatedTotal = totalAllocated + othersAmount
  
  // Check if totals match within epsilon tolerance
  if (!isEqual(calculatedTotal, totalAmount)) {
    errors.push({
      type: ValidationErrorType.MATHEMATICAL_INCONSISTENCY,
      message: `Budget allocation doesn't sum to total. Expected: ${totalAmount}, Calculated: ${calculatedTotal}`,
      value: calculatedTotal,
      expected: totalAmount
    })
  }
  
  // Validate each category allocation
  categories.forEach((category, index) => {
    const negativeError = validateNonNegativeAmount(category.allocated_amount, `categories[${index}].allocated_amount`)
    if (negativeError) errors.push(negativeError)
    
    const precisionError = validateAmountPrecision(category.allocated_amount, `categories[${index}].allocated_amount`)
    if (precisionError) errors.push(precisionError)
  })
  
  // Validate others amount
  const othersNegativeError = validateNonNegativeAmount(othersAmount, 'othersAmount')
  if (othersNegativeError) errors.push(othersNegativeError)
  
  const othersPrecisionError = validateAmountPrecision(othersAmount, 'othersAmount')
  if (othersPrecisionError) errors.push(othersPrecisionError)
  
  return errors
}

/**
 * Validates category addition operation
 */
export function validateCategoryAddition(
  state: BudgetAllocationState,
  categoryId: string,
  categoryName: string,
  categoryColor: string,
  amount: number
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  
  // Validate amount
  const negativeError = validateNonNegativeAmount(amount, 'amount')
  if (negativeError) errors.push(negativeError)
  
  const precisionError = validateAmountPrecision(amount, 'amount')
  if (precisionError) errors.push(precisionError)
  
  // Check for sufficient funds
  const fundsError = validateSufficientFunds(amount, state.othersAmount, 'category addition')
  if (fundsError) errors.push(fundsError)
  
  // Check for duplicate category
  if (state.categories.some(cat => cat.category_id === categoryId)) {
    errors.push({
      type: ValidationErrorType.CATEGORY_ALREADY_EXISTS,
      message: `Category with ID '${categoryId}' already exists`,
      field: 'categoryId',
      value: categoryId as any
    })
  }
  
  // Validate category name
  if (!categoryName || categoryName.trim().length === 0) {
    errors.push({
      type: ValidationErrorType.INVALID_TOTAL,
      message: 'Category name cannot be empty',
      field: 'categoryName'
    })
  }
  
  // Validate category color (basic hex color validation)
  if (!categoryColor || !/^#[0-9A-Fa-f]{6}$/.test(categoryColor)) {
    errors.push({
      type: ValidationErrorType.INVALID_TOTAL,
      message: 'Category color must be a valid hex color (e.g., #FF0000)',
      field: 'categoryColor',
      value: categoryColor as any
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates category update operation
 */
export function validateCategoryUpdate(
  state: BudgetAllocationState,
  categoryId: string,
  newAmount: number
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  
  // Find the category
  const category = state.categories.find(cat => cat.category_id === categoryId)
  if (!category) {
    errors.push({
      type: ValidationErrorType.CATEGORY_NOT_FOUND,
      message: `Category with ID '${categoryId}' not found`,
      field: 'categoryId',
      value: categoryId as any
    })
    return { isValid: false, errors, warnings }
  }
  
  // Validate new amount
  const negativeError = validateNonNegativeAmount(newAmount, 'newAmount')
  if (negativeError) errors.push(negativeError)
  
  const precisionError = validateAmountPrecision(newAmount, 'newAmount')
  if (precisionError) errors.push(precisionError)
  
  // Check for sufficient funds (considering the current allocation)
  const difference = newAmount - category.allocated_amount
  if (difference > 0) {
    const fundsError = validateSufficientFunds(difference, state.othersAmount, 'category update')
    if (fundsError) errors.push(fundsError)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates category removal operation
 */
export function validateCategoryRemoval(
  state: BudgetAllocationState,
  categoryId: string
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  
  // Find the category
  const category = state.categories.find(cat => cat.category_id === categoryId)
  if (!category) {
    errors.push({
      type: ValidationErrorType.CATEGORY_NOT_FOUND,
      message: `Category with ID '${categoryId}' not found`,
      field: 'categoryId',
      value: categoryId as any
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates total budget amount update operation
 */
export function validateTotalAmountUpdate(
  state: BudgetAllocationState,
  newTotal: number
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  
  // Validate new total amount
  const totalErrors = validateTotalBudgetAmount(newTotal)
  errors.push(...totalErrors)
  
  // Check if new total is sufficient for current allocations
  const currentAllocated = state.categories.reduce((sum, cat) => sum + cat.allocated_amount, 0)
  if (newTotal < currentAllocated) {
    errors.push({
      type: ValidationErrorType.INSUFFICIENT_FUNDS,
      message: `New total (${newTotal}) is less than currently allocated amount (${currentAllocated})`,
      value: newTotal,
      expected: currentAllocated
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Comprehensive validation of entire budget allocation state
 */
export function validateBudgetAllocationState(state: BudgetAllocationState): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  
  // Validate currency
  const currencyError = validateCurrency(state.currency)
  if (currencyError) errors.push(currencyError)
  
  // Validate total amount
  const totalErrors = validateTotalBudgetAmount(state.totalAmount)
  errors.push(...totalErrors)
  
  // Validate mathematical consistency
  const mathErrors = validateMathematicalConsistency(state.totalAmount, state.categories, state.othersAmount)
  errors.push(...mathErrors)
  
  // Check for duplicate category IDs
  const categoryIds = state.categories.map(cat => cat.category_id)
  const duplicateIds = categoryIds.filter((id, index) => categoryIds.indexOf(id) !== index)
  if (duplicateIds.length > 0) {
    errors.push({
      type: ValidationErrorType.CATEGORY_ALREADY_EXISTS,
      message: `Duplicate category IDs found: ${duplicateIds.join(', ')}`,
      field: 'categories'
    })
  }
  
  // Validate individual categories
  state.categories.forEach((category, index) => {
    if (!category.category_name || category.category_name.trim().length === 0) {
      errors.push({
        type: ValidationErrorType.INVALID_TOTAL,
        message: `Category at index ${index} has empty name`,
        field: `categories[${index}].category_name`
      })
    }
    
    // Validate color (hex or hsl/var format)
    if (!category.category_color || (!/^#[0-9A-Fa-f]{6}$/.test(category.category_color) && !category.category_color.startsWith('hsl') && !category.category_color.startsWith('var'))) {
      errors.push({
        type: ValidationErrorType.INVALID_TOTAL,
        message: `Category at index ${index} has invalid color`,
        field: `categories[${index}].category_color`,
        value: category.category_color as any
      })
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Safe arithmetic operations with precision handling
 */
export const SafeMath = {
  add: (a: number, b: number): number => roundToPrecision(a + b),
  subtract: (a: number, b: number): number => roundToPrecision(a - b),
  multiply: (a: number, b: number): number => roundToPrecision(a * b),
  divide: (a: number, b: number): number => {
    if (b === 0) throw new Error('Division by zero')
    return roundToPrecision(a / b)
  },
  isEqual: (a: number, b: number): boolean => isEqual(a, b),
  isGreater: (a: number, b: number): boolean => a > b + EPSILON,
  isLess: (a: number, b: number): boolean => a < b - EPSILON,
  isGreaterOrEqual: (a: number, b: number): boolean => a >= b - EPSILON,
  isLessOrEqual: (a: number, b: number): boolean => a <= b + EPSILON
}