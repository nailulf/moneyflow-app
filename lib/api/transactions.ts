import { Transaction, TransactionInsert, TransactionUpdate } from '@/types/database'

// Request deduplication cache
const requestCache = new Map<string, Promise<Transaction[]>>()
const dataCache = new Map<string, { data: Transaction[], timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

/**
 * Fetch all transactions for a user with deduplication and caching
 */
export async function getUserTransactions(userId: string, limit?: number): Promise<Transaction[]> {
  const cacheKey = `transactions-${userId}-${limit || 'all'}`
  
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
      // Use absolute URL to avoid "Invalid URL" errors in server context
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000'
      // Set a high limit to get more transactions (default to 1000 if no limit specified)
      const limitParam = limit ? `&limit=${limit}` : '&limit=1000'
      const response = await fetch(`${baseUrl}/api/transactions?userId=${userId}${limitParam}`)
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Error fetching transactions:', error)
        throw new Error('Failed to fetch transactions')
      }

      const result = await response.json()
      const data = result.transactions || []
      
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

  const result = await response.json()
  return result.transactions || []
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
    const errorData = await response.json()
    console.error('Error creating transaction:', errorData)
    throw new Error(errorData.details || errorData.message || errorData.error || 'Failed to create transaction')
  }

  const result = await response.json()
  return result.transactions || []
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
    const errorData = await response.json()
    console.error('Error updating transaction:', errorData)
    throw new Error(errorData.details || errorData.message || errorData.error || 'Failed to update transaction')
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
  
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  
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

/**
 * Monthly transaction data interface
 */
export interface MonthlyData {
  year: number
  month: number
  monthName: string
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  transactionCount: number
  incomeTransactionCount: number
  expenseTransactionCount: number
}

export interface MonthlyTransactionResponse {
  monthlyData: MonthlyData[]
  summary: {
    totalMonths: number
    averageIncome: number
    averageExpenses: number
    averageNetCashFlow: number
    totalIncome: number
    totalExpenses: number
    totalNetCashFlow: number
  }
  dateRange: {
    startDate: string
    endDate: string
  }
}

/**
 * Fetch monthly aggregated transaction data
 */
export async function getMonthlyTransactions(
  userId: string,
  options?: {
    startDate?: string
    endDate?: string
    months?: number
  }
): Promise<MonthlyTransactionResponse> {
  const params = new URLSearchParams({ userId })
  
  if (options?.startDate) params.append('startDate', options.startDate)
  if (options?.endDate) params.append('endDate', options.endDate)
  if (options?.months) params.append('months', options.months.toString())
  
  const response = await fetch(`/api/transactions/monthly?${params}`)
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching monthly transactions:', error)
    throw new Error(error.message || 'Failed to fetch monthly transaction data')
  }

  return response.json()
}