'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Transaction, TransactionInsert, TransactionUpdate } from '@/types/database'
import { TransactionFormData } from '@/lib/validations'
import { toast } from 'sonner'
import { 
  getUserTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByDateRange
} from '@/lib/api/transactions'

interface UseTransactionManagerProps {
  userId: string
  initialTransactions?: Transaction[]
}

interface UseTransactionManagerReturn {
  transactions: Transaction[]
  isLoading: boolean
  error: string | null
  addTransaction: (data: TransactionFormData) => Promise<void>
  editTransaction: (id: string, data: Partial<TransactionFormData>) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  getTransactionsByDateRange: (startDate: string, endDate: string) => Promise<Transaction[]>
  refreshTransactions: () => Promise<void>
  loadTransactions: () => Promise<void>
}

export function useTransactionManager({
  userId,
  initialTransactions = [],
}: UseTransactionManagerProps): UseTransactionManagerReturn {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load transactions from database
  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getUserTransactions(userId)
      setTransactions(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Load transactions on mount
  useEffect(() => {
    if (userId) {
      loadTransactions()
    }
  }, [userId, loadTransactions])

  const addTransaction = useCallback(async (formData: TransactionFormData) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const transactionData: TransactionInsert = {
        user_id: userId,
        ...formData,
      }
      
      const newTransaction = await createTransaction(transactionData)
      setTransactions(prev => [newTransaction, ...prev])
      toast.success('Transaction added successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add transaction'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const editTransaction = useCallback(async (id: string, formData: Partial<TransactionFormData>) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const updateData: TransactionUpdate = {
        ...formData,
      }
      
      const updatedTransaction = await updateTransaction(id, updateData)
      
      setTransactions(prev => prev.map(transaction => 
        transaction.id === id ? updatedTransaction : transaction
      ))
      
      toast.success('Transaction updated successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, []) // Optimized: no dependencies needed for this function

  const removeTransaction = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      await deleteTransaction(id)
      setTransactions(prev => prev.filter(transaction => transaction.id !== id))
      toast.success('Transaction deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, []) // Optimized: no dependencies needed for this function

  const getTransactionsByDateRangeHandler = useCallback(async (startDate: string, endDate: string) => {
    try {
      setIsLoading(true)
      setError(null)
      return await getTransactionsByDateRange(userId, startDate, endDate)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get transactions'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const refreshTransactions = useCallback(async () => {
    await loadTransactions()
  }, [loadTransactions])

  return {
    transactions,
    isLoading,
    error,
    addTransaction,
    editTransaction,
    removeTransaction,
    getTransactionsByDateRange: getTransactionsByDateRangeHandler,
    refreshTransactions,
    loadTransactions
  }
}