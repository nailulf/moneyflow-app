import { CategoryGroupDB, CategoryGroupInsert, CategoryGroupUpdate } from '@/types/database'
import { CategoryGroupData } from '@/types/app'

// Get all category groups for a user
export async function getUserCategoryGroups(userId: string): Promise<CategoryGroupDB[]> {
  const response = await fetch(`/api/category-groups?userId=${userId}`)
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching category groups:', error)
    throw new Error('Failed to fetch category groups')
  }

  return await response.json()
}

// Create a new category group
export async function createCategoryGroup(categoryGroup: CategoryGroupInsert): Promise<CategoryGroupDB> {
  const response = await fetch('/api/category-groups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryGroup),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error creating category group:', error)
    throw new Error('Failed to create category group')
  }

  return await response.json()
}

// Update an existing category group
export async function updateCategoryGroup(id: string, updates: CategoryGroupUpdate): Promise<CategoryGroupDB> {
  const response = await fetch('/api/category-groups', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, ...updates }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error updating category group:', error)
    throw new Error('Failed to update category group')
  }

  return await response.json()
}

// Delete a category group (soft delete)
export async function deleteCategoryGroup(id: string): Promise<void> {
  const response = await fetch(`/api/category-groups?id=${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error deleting category group:', error)
    throw new Error('Failed to delete category group')
  }
}

// Initialize default category groups for a new user
export async function initializeDefaultCategoryGroups(userId: string): Promise<CategoryGroupDB[]> {
  // First, check if category groups already exist
  const existingGroups = await getUserCategoryGroups(userId)
  
  // If groups already exist, return them
  if (existingGroups.length > 0) {
    console.log('Category groups already exist, skipping initialization')
    return existingGroups
  }
  
  const defaultCategoryGroups: CategoryGroupInsert[] = [
    {
      user_id: userId,
      name: 'Expenses',
      type: 'EXPENSE',
      color: '#EF4444',
      is_default: true,
      sort_order: 1
    },
    {
      user_id: userId,
      name: 'Income',
      type: 'INCOME',
      color: '#10B981',
      is_default: true,
      sort_order: 2
    },
    {
      user_id: userId,
      name: 'Transfer',
      type: 'TRANSFER',
      color: '#6B7280',
      is_default: true,
      sort_order: 3
    }
  ]

  // Create category groups one by one using the API
  const createdCategoryGroups: CategoryGroupDB[] = []
  
  for (const categoryGroup of defaultCategoryGroups) {
    try {
      const created = await createCategoryGroup(categoryGroup)
      createdCategoryGroups.push(created)
    } catch (error: unknown) {
      console.error(`Error creating default category group ${categoryGroup.name}:`, error)
      // Continue with other category groups even if one fails
    }
  }

  return createdCategoryGroups
}

// Convert database category groups to CategoryGroupData format
interface CategoryData {
  id: string;
  name: string;
  color: string;
  category_group_id: string | null;
  is_custom: boolean;
}

export function convertCategoryGroupsToGroupData(
  categoryGroups: CategoryGroupDB[],
  categories: CategoryData[] = []
): CategoryGroupData[] {
  return categoryGroups
    .filter(group => group.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(group => ({
      id: group.id,
      name: group.name,
      type: group.type,
      color: group.color,
      icon: group.icon,
      isDefault: group.is_default,
      isActive: group.is_active,
      sortOrder: group.sort_order,
      categories: categories
        .filter(cat => cat.category_group_id === group.id)
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          groupType: group.type,
          categoryGroupId: cat.category_group_id || group.id,
          isCustom: cat.is_custom
        }))
    }))
}

// Convert CategoryGroupData to CategoryGroupInsert
export function convertToGroupInsert(item: Omit<CategoryGroupData, 'id' | 'categories'>, userId: string): CategoryGroupInsert {
  return {
    user_id: userId,
    name: item.name,
    type: item.type,
    color: item.color,
    icon: item.icon,
    is_default: item.isDefault ?? false,
    sort_order: item.sortOrder ?? 0
  }
}