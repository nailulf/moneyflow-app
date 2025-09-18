'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { AccountDB } from '@/types/database'

interface AccountContextType {
  accounts: AccountDB[]
  loading: boolean
  error: string | null
  refreshAccounts: () => Promise<void>
  getDefaultAccount: () => AccountDB | null
  createAccount: (accountData: Omit<AccountDB, 'id' | 'created_at' | 'updated_at'>) => Promise<AccountDB>
  updateAccount: (id: string, accountData: Partial<AccountDB>) => Promise<AccountDB>
  deleteAccount: (id: string) => Promise<void>
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

interface AccountProviderProps {
  children: React.ReactNode
  userId: string
}

export function AccountProvider({ children, userId }: AccountProviderProps) {
  const [accounts, setAccounts] = useState<AccountDB[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/accounts?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }
      
      const data = await response.json()
      setAccounts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching accounts:', err)
      setError('Failed to load accounts')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const refreshAccounts = useCallback(async () => {
    await fetchAccounts()
  }, [fetchAccounts])

  const getDefaultAccount = useCallback(() => {
    return accounts.find(account => account.is_default && account.is_active) || null
  }, [accounts])

  const createAccount = useCallback(async (accountData: Omit<AccountDB, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      })

      if (!response.ok) {
        throw new Error('Failed to create account')
      }

      const newAccount = await response.json()
      setAccounts(prev => [...prev, newAccount])
      return newAccount
    } catch (err) {
      console.error('Error creating account:', err)
      throw err
    }
  }, [])

  const updateAccount = useCallback(async (id: string, accountData: Partial<AccountDB>) => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...accountData }),
      })

      if (!response.ok) {
        throw new Error('Failed to update account')
      }

      const updatedAccount = await response.json()
      setAccounts(prev => prev.map(account => 
        account.id === id ? updatedAccount : account
      ))
      return updatedAccount
    } catch (err) {
      console.error('Error updating account:', err)
      throw err
    }
  }, [])

  const deleteAccount = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/accounts?accountId=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      setAccounts(prev => prev.filter(account => account.id !== id))
    } catch (err) {
      console.error('Error deleting account:', err)
      throw err
    }
  }, [])

  useEffect(() => {
    if (userId) {
      fetchAccounts()
    }
  }, [userId, fetchAccounts])

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