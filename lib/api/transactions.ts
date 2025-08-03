import { Transaction, TransactionInsert, TransactionUpdate } from '@/types/database'

/**
 * Fetch all transactions for a user
 */
export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const response = await fetch(`/api/transactions?userId=${userId}`)
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching transactions:', error)
    throw new Error('Failed to fetch transactions')
  }

  return await response.json()
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

  const stats = data.reduce(
    (acc: { totalIncome: number; totalExpense: number }, transaction: Transaction) => {
      if (transaction.type === 'INCOME') {
        acc.totalIncome += transaction.amount
      } else {
        acc.totalExpense += transaction.amount
      }
      return acc
    },
    { totalIncome: 0, totalExpense: 0 }
  )

  return {
    ...stats,
    netAmount: stats.totalIncome - stats.totalExpense,
    transactionCount: data.length
  }
}