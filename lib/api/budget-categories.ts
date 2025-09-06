import { BudgetCategoryDB, BudgetCategoryInsert, BudgetCategoryUpdate } from '@/types/database'

// Create a new budget category
export async function createBudgetCategory(budgetCategory: BudgetCategoryInsert): Promise<BudgetCategoryDB> {
  const response = await fetch('/api/budget-categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(budgetCategory),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error creating budget category:', error)
    throw new Error('Failed to create budget category')
  }

  const createdBudgetCategory = await response.json()
  return createdBudgetCategory
}

// Get budget categories for a specific budget
export async function getBudgetCategories(budgetId: string): Promise<BudgetCategoryDB[]> {
  const response = await fetch(`/api/budget-categories?budgetId=${budgetId}`)

  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching budget categories:', error)
    throw new Error('Failed to fetch budget categories')
  }

  const data = await response.json()
  return data
}

// Update a budget category
export async function updateBudgetCategory(budgetCategory: BudgetCategoryUpdate): Promise<BudgetCategoryDB> {
  const response = await fetch('/api/budget-categories', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(budgetCategory),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error updating budget category:', error)
    throw new Error('Failed to update budget category')
  }

  const updatedBudgetCategory = await response.json()
  return updatedBudgetCategory
}

// Delete a budget category
export async function deleteBudgetCategory(budgetCategoryId: string): Promise<void> {
  const response = await fetch(`/api/budget-categories?id=${budgetCategoryId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error deleting budget category:', error)
    throw new Error('Failed to delete budget category')
  }
}

// Bulk update budget categories for a budget
export async function bulkUpdateBudgetCategories(
  budgetId: string,
  categories: Array<{
    id?: string
    category_id: string
    allocated_amount: number
    action: 'create' | 'update' | 'delete'
  }>
): Promise<BudgetCategoryDB[]> {
  const response = await fetch('/api/budget-categories/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ budgetId, categories }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error bulk updating budget categories:', error)
    throw new Error('Failed to bulk update budget categories')
  }

  const updatedCategories = await response.json()
  return updatedCategories
}