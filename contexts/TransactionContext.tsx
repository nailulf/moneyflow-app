'use client'

import React, { createContext, useContext, useCallback } from 'react'
import { Transaction, TransactionInsert, TransactionUpdate } from '@/types/database'
import { TransactionFormData } from '@/lib/validations'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useAllTransactions, useTransactionMutations } from '@/hooks/useTransactionsQuery'
import { getTransactionsByDateRange } from '@/lib/api/transactions'

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
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const { user } = useAuth()
  const userId = user?.id || ''

  // Use React Query for efficient data fetching with automatic pagination
  const {
    transactions,
    totalCount,
    isLoading: loading,
    isError,
    error: queryError,
    refetch,
  } = useAllTransactions({
    userId,
    enabled: !!userId,
  })

  // Use React Query mutations for create/update/delete
  const mutations = useTransactionMutations(userId)

  const error = isError && queryError ? queryError.message : null

  const addTransaction = useCallback(
    async (formData: TransactionFormData) => {
      const transactionData: TransactionInsert = {
        user_id: userId,
        ...formData,
      }

      try {
        await mutations.create(transactionData)
      } catch (err) {
        throw err
      }
    },
    [userId, mutations]
  )

  const editTransaction = useCallback(
    async (id: string, formData: Partial<TransactionFormData>) => {
      const updateData: TransactionUpdate = {
        ...formData,
      }

      try {
        await mutations.update({ id, data: updateData })
      } catch (err) {
        throw err
      }
    },
    [mutations]
  )

  const removeTransaction = useCallback(
    async (id: string) => {
      try {
        await mutations.delete(id)
      } catch (err) {
        throw err
      }
    },
    [mutations]
  )

  const getTransactionsByDateRangeHandler = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        return await getTransactionsByDateRange(userId, startDate, endDate)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get transactions by date range'
        toast.error(errorMessage)
        throw err
      }
    },
    [userId]
  )

  const refreshTransactions = useCallback(async () => {
    try {
      await refetch()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh transactions'
      toast.error(errorMessage)
    }
  }, [refetch])

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