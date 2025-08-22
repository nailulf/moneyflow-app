import { Transaction, TransactionInsert, TransactionUpdate } from '@/types/database'

// Request deduplication cache
const requestCache = new Map<string, Promise<Transaction[]>>()
const dataCache = new Map<string, { data: Transaction[], timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

/**
 * Fetch all transactions for a user with deduplication and caching
 */
export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const cacheKey = `transactions-${userId}`
  
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
      const response = await fetch(`/api/transactions?userId=${userId}`)
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Error fetching transactions:', error)
        throw new Error('Failed to fetch transactions')
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

/**
 * Fetch transactions for a specific date range
 */
export async function getTransactionsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  const params = new URLSearchParams({
    userId,
    startDate,
    endDate
  })
  
  const response = await fetch(`/api/transactions?${params}`)
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching transactions by date range:', error)
    throw new Error('Failed to fetch transactions')
  }

  return await response.json()
}

/**
 * Create a new transaction
 */
export async function createTransaction(transaction: TransactionInsert): Promise<Transaction> {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transaction),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error creating transaction:', error)
    throw new Error('Failed to create transaction')
  }

  return await response.json()
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(
  id: string,
  updates: TransactionUpdate
): Promise<Transaction> {
  const response = await fetch('/api/transactions', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, ...updates }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error updating transaction:', error)
    throw new Error('Failed to update transaction')
  }

  return await response.json()
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: string): Promise<void> {
  const response = await fetch(`/api/transactions?id=${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error deleting transaction:', error)
    throw new Error('Failed to delete transaction')
  }
}

/**
 * Get transactions by category
 */
export async function getTransactionsByCategory(
  userId: string,
  categoryId: string
): Promise<Transaction[]> {
  const params = new URLSearchParams({
    userId,
    categoryId
  })
  
  const response = await fetch(`/api/transactions?${params}`)
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching transactions by category:', error)
    throw new Error('Failed to fetch transactions')
  }

  return await response.json()
}

/**
 * Get transaction statistics for a user
 */
export async function getTransactionStats(userId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ userId })
  
  if (startDate) {
    params.append('startDate', startDate)
  }
  if (endDate) {
    params.append('endDate', endDate)
  }

  const response = await fetch(`/api/transactions?${params}`)
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching transaction stats:', error)
    throw new Error('Failed to fetch transaction statistics')
  }

  const data: Transaction[] = await response.json()

  // Exclude TRANSFER transactions from stats
  const relevant = data.filter(t => t.type !== 'TRANSFER')

  const totalIncome = relevant
    .filter(t => t.type === 'INCOME' && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = Math.abs(
    relevant
      .filter(t => t.type === 'EXPENSE' && t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  )

  return {
    totalIncome,
    totalExpense,
    netAmount: totalIncome - totalExpense,
    transactionCount: relevant.length
  }
}