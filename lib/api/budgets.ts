import { BudgetDB,BudgetInsert, BudgetUpdate } from "@/types/database";
import { Budget, BudgetItem } from "@/types/app";

// Request deduplication cache
const requestCache = new Map<string, Promise<BudgetDB[]>>()
const dataCache = new Map<string, { data: BudgetDB[], timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

// Get all categories for a user with deduplication and caching
export async function getUserBudgets(userId: string): Promise<BudgetDB[]> {
  const cacheKey = `budgets-${userId}`
  
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
      const response = await fetch(`/api/budgets?userId=${userId}`)
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Error fetching budgets:', error)
        throw new Error('Failed to fetch budgets')
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
  
  // Add to request cache
  requestCache.set(cacheKey, requestPromise)
  
  return requestPromise
}

// Update an existing budget
export async function updateBudget(budget: BudgetUpdate): Promise<BudgetDB> {
  const response = await fetch('/api/budgets', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(budget),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error updating budget:', error)
    throw new Error('Failed to update budget')
  }

  const updatedBudget = await response.json()

  // Invalidate cache
  dataCache.delete(`budgets-${budget.id}`)
  // Invalidate item cache
  dataCache.delete(`budgetItems-${budget.id}`)

  return updatedBudget
}


// Delete a budget (soft delete)
export async function deleteBudget(budgetId: string): Promise<void> {
  const response = await fetch(`/api/budgets/${budgetId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error deleting budget:', error)
    throw new Error('Failed to delete budget')
  }

  // Invalidate cache
  dataCache.delete(`budgets-${budgetId}`)
  // Invalidate item cache
  dataCache.delete(`budgetItems-${budgetId}`)
}

// Create a new budget
export async function createBudget(budget: BudgetInsert): Promise<BudgetDB> {
  const response = await fetch('/api/budgets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(budget),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error creating budget:', error)
    throw new Error('Failed to create budget')
  }

  const createdBudget = await response.json()

  return createdBudget
}

//retrieve the budgetsItem from budgetID
export async function getBudgetItems(budgetId: string): Promise<BudgetItem[]> {
  const response = await fetch(`/api/budget-items?budgetId=${budgetId}`)

  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching budget items:', error)
    throw new Error('Failed to fetch budget items')
  }

  const data = await response.json()

  return data
}

