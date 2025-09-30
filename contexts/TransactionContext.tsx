'use client'

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
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

interface TransactionContextType {
  transactions: Transaction[]
  loading: boolean
  error: string | null
  addTransaction: (data: TransactionFormData) => Promise<void>
  editTransaction: (id: string, data: Partial<TransactionFormData>) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  getTransactionsByDateRange: (startDate: string, endDate: string) => Promise<Transaction[]>
  refreshTransactions: () => Promise<void>
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

interface TransactionProviderProps {
  children: React.ReactNode
  userId: string
}

export function TransactionProvider({ children, userId }: TransactionProviderProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  
  // Load transactions from database
  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch more transactions to ensure we get all historical data
      const data = await getUserTransactions(userId, 5000) // Increased limit to 5000
      setTransactions(data)
      setHasLoaded(true)
      console.log(`📊 Loaded ${data.length} transactions for user ${userId}`)
    } catch (err) {
      console.error('❌ Error loading transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Load transactions on mount - simplified
  useEffect(() => {
    if (userId && !hasLoaded) {
      loadTransactions()
    }
  }, [userId, hasLoaded, loadTransactions])

  const addTransaction = useCallback(async (formData: TransactionFormData) => {
    try {
      setLoading(true)
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
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  const editTransaction = useCallback(async (id: string, formData: Partial<TransactionFormData>) => {
    try {
      setLoading(true)
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
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const removeTransaction = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      await deleteTransaction(id)
      setTransactions(prev => prev.filter(transaction => transaction.id !== id))
      toast.success('Transaction deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getTransactionsByDateRangeHandler = useCallback(async (startDate: string, endDate: string) => {
    try {
      setError(null)
      return await getTransactionsByDateRange(userId, startDate, endDate)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get transactions by date range'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    }
  }, [userId])

  const refreshTransactions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getUserTransactions(userId)
      setTransactions(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh transactions'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const value: TransactionContextType = {
    transactions,
    loading,
    error,
    addTransaction,
    editTransaction,
    removeTransaction,
    getTransactionsByDateRange: getTransactionsByDateRangeHandler,
    refreshTransactions
  }

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  )
}

export function useTransactions() {
  const context = useContext(TransactionContext)
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider')
  }
  return context
}