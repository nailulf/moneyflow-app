'use client'

import React, { createContext, useContext, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AccountDB } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { queryKeys } from '@/hooks/useDataRefresh'

export interface AccountWithHistory extends AccountDB {
  historicalBalance?: number
  currentBalance?: number
}

interface AccountContextType {
  accounts: AccountWithHistory[]
  loading: boolean
  error: string | null
  refreshAccounts: () => Promise<void>
  getDefaultAccount: () => AccountWithHistory | null
  createAccount: (accountData: Omit<AccountDB, 'id' | 'created_at' | 'updated_at'>) => Promise<AccountDB>
  updateAccount: (id: string, accountData: Partial<AccountDB>) => Promise<AccountDB>
  deleteAccount: (id: string) => Promise<void>
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

interface AccountProviderProps {
  children: React.ReactNode
}

// Fetch function for accounts
async function fetchAccounts(userId: string): Promise<AccountWithHistory[]> {
  const response = await fetch(`/api/accounts?userId=${userId}&includeHistory=true`)
  if (!response.ok) {
    throw new Error('Failed to fetch accounts')
  }

  const data = await response.json()
  return Array.isArray(data) ? data.map((acc: AccountWithHistory) => ({
    ...acc,
    currentBalance: acc.historicalBalance ?? acc.balance
  })) : []
}

export function AccountProvider({ children }: AccountProviderProps) {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()

  // Use React Query for accounts with automatic caching and invalidation
  const {
    data: accounts = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.accounts(userId),
    queryFn: () => fetchAccounts(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load accounts') : null

  // Invalidate related queries when accounts change
  const invalidateRelatedQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts(userId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.netWorth(userId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions(userId) })
  }, [queryClient, userId])

  // Create account mutation
  const createMutation = useMutation({
    mutationFn: async (accountData: Omit<AccountDB, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
      })
      if (!response.ok) throw new Error('Failed to create account')
      return response.json()
    },
    onSuccess: () => {
      invalidateRelatedQueries()
    },
  })

  // Update account mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...accountData }: { id: string } & Partial<AccountDB>) => {
      const response = await fetch('/api/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...accountData }),
      })
      if (!response.ok) throw new Error('Failed to update account')
      return response.json()
    },
    onSuccess: () => {
      invalidateRelatedQueries()
    },
  })

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/accounts?accountId=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete account')
    },
    onSuccess: () => {
      invalidateRelatedQueries()
    },
  })

  const refreshAccounts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.accounts(userId) })
    await refetch()
  }, [queryClient, userId, refetch])

  const getDefaultAccount = useCallback(() => {
    return accounts.find(account => account.is_default && account.is_active) || null
  }, [accounts])

  const createAccount = useCallback(async (accountData: Omit<AccountDB, 'id' | 'created_at' | 'updated_at'>) => {
    return createMutation.mutateAsync(accountData)
  }, [createMutation])

  const updateAccount = useCallback(async (id: string, accountData: Partial<AccountDB>) => {
    return updateMutation.mutateAsync({ id, ...accountData })
  }, [updateMutation])

  const deleteAccount = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id)
  }, [deleteMutation])

  const value: AccountContextType = {
    accounts,
    loading,
    error,
    refreshAccounts,
    getDefaultAccount,
    createAccount,
    updateAccount,
    deleteAccount,
  }

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccounts() {
  const context = useContext(AccountContext)
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountProvider')
  }
  return context
}
