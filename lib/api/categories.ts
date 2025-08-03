import { CategoryDB, CategoryInsert, CategoryUpdate } from '@/types/database'
import { CategoryGroupData, CategoryItem, CategoryGroup, Category } from '@/types/app'

// Get all categories for a user
export async function getUserCategories(userId: string): Promise<CategoryDB[]> {
  const response = await fetch(`/api/categories?userId=${userId}`)
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching categories:', error)
    throw new Error('Failed to fetch categories')
  }

  return await response.json()
}

// Create a new category
export async function createCategory(category: CategoryInsert): Promise<CategoryDB> {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(category),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error creating category:', error)
    throw new Error('Failed to create category')
  }

  return await response.json()
}

// Update an existing category
export async function updateCategory(id: string, updates: CategoryUpdate): Promise<CategoryDB> {
  const response = await fetch('/api/categories', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, ...updates }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error updating category:', error)
    throw new Error('Failed to update category')
  }

  return await response.json()
}

// Delete a category (soft delete)
export async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(`/api/categories?id=${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error deleting category:', error)
    throw new Error('Failed to delete category')
  }
}

// Initialize default categories for a new user
export async function initializeDefaultCategories(userId: string): Promise<CategoryDB[]> {
  const defaultCategories: CategoryInsert[] = [
    // Expense categories
    { user_id: userId, name: 'Food & Dining', color: '#FF6B6B', group_type: 'EXPENSE', is_custom: false },
    { user_id: userId, name: 'Transportation', color: '#4ECDC4', group_type: 'EXPENSE', is_custom: false },
    { user_id: userId, name: 'Shopping', color: '#45B7D1', group_type: 'EXPENSE', is_custom: false },
    { user_id: userId, name: 'Entertainment', color: '#96CEB4', group_type: 'EXPENSE', is_custom: false },
    { user_id: userId, name: 'Bills & Utilities', color: '#FFEAA7', group_type: 'EXPENSE', is_custom: false },
    { user_id: userId, name: 'Healthcare', color: '#DDA0DD', group_type: 'EXPENSE', is_custom: false },
    { user_id: userId, name: 'Education', color: '#98D8C8', group_type: 'EXPENSE', is_custom: false },
    { user_id: userId, name: 'Travel', color: '#F7DC6F', group_type: 'EXPENSE', is_custom: false },
    { user_id: userId, name: 'Other', color: '#AED6F1', group_type: 'EXPENSE', is_custom: false },
    // Income category
    { user_id: userId, name: 'Income', color: '#82E0AA', group_type: 'INCOME', is_custom: false }
  ]

  // Create categories one by one using the API
  const createdCategories: CategoryDB[] = []
  
  for (const category of defaultCategories) {
    try {
      const created = await createCategory(category)
      createdCategories.push(created)
    } catch (error) {
      console.error(`Error creating default category ${category.name}:`, error)
      // Continue with other categories even if one fails
    }
  }

  return createdCategories
}

// Convert database categories to CategoryGroupData format
export function convertToGroupData(categories: CategoryDB[]): CategoryGroupData[] {
  const expenseCategories = categories
    .filter(cat => cat.group_type === 'EXPENSE')
    .map(cat => ({
      id: cat.id,
      name: cat.name as Category,
      color: cat.color,
      group: 'EXPENSE' as CategoryGroup,
      isCustom: cat.is_custom
    }))

  const incomeCategories = categories
    .filter(cat => cat.group_type === 'INCOME')
    .map(cat => ({
      id: cat.id,
      name: cat.name as Category,
      color: cat.color,
      group: 'INCOME' as CategoryGroup,
      isCustom: cat.is_custom
    }))

  return [
    {
      id: 'EXPENSE',
      name: 'Expense',
      categories: expenseCategories
    },
    {
      id: 'INCOME',
      name: 'Income',
      categories: incomeCategories
    }
  ]
}

// Convert CategoryItem to CategoryInsert
export function convertToInsert(item: Omit<CategoryItem, 'id'>, userId: string): CategoryInsert {
  return {
    user_id: userId,
    name: item.name,
    color: item.color,
    group_type: item.group,
    is_custom: item.isCustom ?? true
  }
}