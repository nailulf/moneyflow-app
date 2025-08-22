import { CategoryDB, CategoryInsert, CategoryUpdate } from '@/types/database'
import { CategoryGroupData, CategoryItem, CategoryGroup, Category } from '@/types/app'

// Request deduplication cache
const requestCache = new Map<string, Promise<CategoryDB[]>>()
const dataCache = new Map<string, { data: CategoryDB[], timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

// Get all categories for a user with deduplication and caching
export async function getUserCategories(userId: string): Promise<CategoryDB[]> {
  const cacheKey = `categories-${userId}`
  
  // Check data cache first
  const cached = dataCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  // Check if request is already in progress
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey)!
  }
  
  // Create new request
  const requestPromise = (async () => {
    try {
      const response = await fetch(`/api/categories?userId=${userId}`)
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Error fetching categories:', error)
        throw new Error('Failed to fetch categories')
      }

      const data = await response.json()
      
      // Cache the result
      dataCache.set(cacheKey, { data, timestamp: Date.now() })
      
      return data
    } finally {
      // Remove from request cache when done
      requestCache.delete(cacheKey)
    }
  })()
  
  // Store the promise to prevent duplicate requests
  requestCache.set(cacheKey, requestPromise)
  
  return requestPromise
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

// Initialize default categories for a new user with category groups
export async function initializeDefaultCategories(userId: string, categoryGroups: { id: string, type: string }[]): Promise<CategoryDB[]> {
  // First check if user already has categories
  try {
    const existingCategories = await getUserCategories(userId)
    if (existingCategories.length > 0) {
      console.log('User already has categories, skipping default initialization')
      return existingCategories
    }
  } catch (error) {
    console.log('Error checking existing categories, proceeding with initialization:', error)
  }

  // Find category group IDs by type
  const expenseGroupId = categoryGroups.find(g => g.type === 'EXPENSE')?.id
  const incomeGroupId = categoryGroups.find(g => g.type === 'INCOME')?.id
  const transferGroupId = categoryGroups.find(g => g.type === 'TRANSFER')?.id

  if (!expenseGroupId || !incomeGroupId || !transferGroupId) {
    throw new Error('Required category groups not found')
  }

  const defaultCategories: CategoryInsert[] = [
    // Expense categories
    { user_id: userId, name: 'Food & Dining', color: '#FF6B6B', category_group_id: expenseGroupId, is_custom: false },
    { user_id: userId, name: 'Transportation', color: '#4ECDC4', category_group_id: expenseGroupId, is_custom: false },
    { user_id: userId, name: 'Shopping', color: '#45B7D1', category_group_id: expenseGroupId, is_custom: false },
    { user_id: userId, name: 'Entertainment', color: '#96CEB4', category_group_id: expenseGroupId, is_custom: false },
    { user_id: userId, name: 'Bills & Utilities', color: '#FFEAA7', category_group_id: expenseGroupId, is_custom: false },
    { user_id: userId, name: 'Healthcare', color: '#DDA0DD', category_group_id: expenseGroupId, is_custom: false },
    { user_id: userId, name: 'Education', color: '#98D8C8', category_group_id: expenseGroupId, is_custom: false },
    { user_id: userId, name: 'Travel', color: '#F7DC6F', category_group_id: expenseGroupId, is_custom: false },
    { user_id: userId, name: 'Other', color: '#AED6F1', category_group_id: expenseGroupId, is_custom: false },
    // Income category
    { user_id: userId, name: 'Income', color: '#82E0AA', category_group_id: incomeGroupId, is_custom: false },
    // Transfer categories
    { user_id: userId, name: 'Transfer', color: '#9CA3AF', category_group_id: transferGroupId, is_custom: false },
    { user_id: userId, name: 'Savings transfer', color: '#6B7280', category_group_id: transferGroupId, is_custom: false },
    { user_id: userId, name: 'Credit card payment', color: '#4B5563', category_group_id: transferGroupId, is_custom: false }
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

// Convert database categories to CategoryGroupData format (deprecated - use category-groups API)
export function convertToGroupData(categories: CategoryDB[]): CategoryGroupData[] {
  // This function is kept for backward compatibility
  // New code should use the category-groups API and convertCategoryGroupsToGroupData
  const expenseCategories = categories
    .filter(cat => cat.group_type === 'EXPENSE')
    .map(cat => ({
      id: cat.id,
      name: cat.name as Category,
      color: cat.color,
      groupType: 'EXPENSE' as CategoryGroup,
      categoryGroupId: cat.category_group_id || '',
      isCustom: cat.is_custom
    }))

  const incomeCategories = categories
    .filter(cat => cat.group_type === 'INCOME')
    .map(cat => ({
      id: cat.id,
      name: cat.name as Category,
      color: cat.color,
      groupType: 'INCOME' as CategoryGroup,
      categoryGroupId: cat.category_group_id || '',
      isCustom: cat.is_custom
    }))

  const transferCategories = categories
    .filter(cat => cat.group_type === 'TRANSFER')
    .map(cat => ({
      id: cat.id,
      name: cat.name as Category,
      color: cat.color,
      groupType: 'TRANSFER' as CategoryGroup,
      categoryGroupId: cat.category_group_id || '',
      isCustom: cat.is_custom
    }))

  const groups: CategoryGroupData[] = [
    {
      id: 'EXPENSE',
      name: 'Expense',
      type: 'EXPENSE',
      color: '#EF4444',
      isDefault: true,
      isActive: true,
      sortOrder: 1,
      categories: expenseCategories
    },
    {
      id: 'INCOME',
      name: 'Income',
      type: 'INCOME',
      color: '#10B981',
      isDefault: true,
      isActive: true,
      sortOrder: 2,
      categories: incomeCategories
    }
  ]

  if (transferCategories.length > 0) {
    groups.push({
      id: 'TRANSFER',
      name: 'Transfer',
      type: 'TRANSFER',
      color: '#6B7280',
      isDefault: true,
      isActive: true,
      sortOrder: 3,
      categories: transferCategories
    })
  }

  return groups
}

// Convert CategoryItem to CategoryInsert
export function convertToInsert(item: Omit<CategoryItem, 'id'>, userId: string): CategoryInsert {
  // Map CategoryGroupType to database group_type
  const mapGroupType = (type: string): 'EXPENSE' | 'INCOME' | 'TRANSFER' => {
    if (type === 'INCOME') return 'INCOME'
    if (type === 'TRANSFER') return 'TRANSFER'
    return 'EXPENSE' // Default for EXPENSE and CUSTOM
  }

  return {
    user_id: userId,
    name: item.name,
    color: item.color,
    group_type: mapGroupType(item.groupType || 'EXPENSE'),
    category_group_id: item.categoryGroupId || undefined,
    is_custom: item.isCustom ?? true
  }
}