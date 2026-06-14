'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

/**
 * Query keys for different data types
 * Used for cache invalidation across the app
 */
export const queryKeys = {
  transactions: (userId?: string) => userId ? ['transactions', userId] : ['transactions'],
  categories: (userId?: string) => userId ? ['categories', userId] : ['categories'],
  accounts: (userId?: string) => userId ? ['accounts', userId] : ['accounts'],
  budgets: (userId?: string) => userId ? ['budgets', userId] : ['budgets'],
  netWorth: (userId?: string) => userId ? ['net-worth', userId] : ['net-worth'],
  onboarding: (userId?: string) => userId ? ['onboarding', userId] : ['onboarding'],
  forecastScenarios: () => ['forecast', 'scenarios'] as const,
  forecastEvents: (scenarioId: string) => ['forecast', 'events', scenarioId] as const,
  forecastCashflow: () => ['forecast', 'cashflow'] as const,
  all: () => ['all'],
}

/**
 * Custom hook for centralized data refresh across the app
 * Uses React Query's cache invalidation for automatic UI updates
 */
export function useDataRefresh() {
  const queryClient = useQueryClient()

  /**
   * Refresh transactions data
   */
  const refreshTransactions = useCallback((userId?: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.transactions(userId),
      refetchType: 'active'
    })
  }, [queryClient])

  /**
   * Refresh categories data
   */
  const refreshCategories = useCallback((userId?: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.categories(userId),
      refetchType: 'active'
    })
  }, [queryClient])

  /**
   * Refresh accounts data
   */
  const refreshAccounts = useCallback((userId?: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.accounts(userId),
      refetchType: 'active'
    })
  }, [queryClient])

  /**
   * Refresh budgets data
   */
  const refreshBudgets = useCallback((userId?: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.budgets(userId),
      refetchType: 'active'
    })
  }, [queryClient])

  /**
   * Refresh net worth data
   */
  const refreshNetWorth = useCallback((userId?: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.netWorth(userId),
      refetchType: 'active'
    })
  }, [queryClient])

  /**
   * Refresh onboarding data
   */
  const refreshOnboarding = useCallback((userId?: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.onboarding(userId),
      refetchType: 'active'
    })
  }, [queryClient])

  /**
   * Refresh all data for a user
   */
  const refreshAll = useCallback((userId?: string) => {
    return Promise.all([
      refreshTransactions(userId),
      refreshCategories(userId),
      refreshAccounts(userId),
      refreshBudgets(userId),
      refreshNetWorth(userId),
      refreshOnboarding(userId),
    ])
  }, [refreshTransactions, refreshCategories, refreshAccounts, refreshBudgets, refreshNetWorth, refreshOnboarding])

  /**
   * Refresh data related to financial changes
   * (transactions, accounts, net worth, budgets)
   */
  const refreshFinancialData = useCallback((userId?: string) => {
    return Promise.all([
      refreshTransactions(userId),
      refreshAccounts(userId),
      refreshNetWorth(userId),
      refreshBudgets(userId),
    ])
  }, [refreshTransactions, refreshAccounts, refreshNetWorth, refreshBudgets])

  return {
    refreshTransactions,
    refreshCategories,
    refreshAccounts,
    refreshBudgets,
    refreshNetWorth,
    refreshOnboarding,
    refreshAll,
    refreshFinancialData,
    queryClient,
  }
}

/**
 * Hook to set up automatic data refresh based on events
 * Can be used in layout components to handle global refresh events
 */
export function useAutoRefresh(userId?: string) {
  const dataRefresh = useDataRefresh()

  const onTransactionChange = useCallback(() => {
    dataRefresh.refreshTransactions(userId)
    dataRefresh.refreshNetWorth(userId)
    dataRefresh.refreshBudgets(userId)
  }, [dataRefresh, userId])

  const onCategoryChange = useCallback(() => {
    dataRefresh.refreshCategories(userId)
    dataRefresh.refreshTransactions(userId) // Transactions display category names
  }, [dataRefresh, userId])

  const onAccountChange = useCallback(() => {
    dataRefresh.refreshAccounts(userId)
    dataRefresh.refreshNetWorth(userId)
    dataRefresh.refreshTransactions(userId)
  }, [dataRefresh, userId])

  const onBudgetChange = useCallback(() => {
    dataRefresh.refreshBudgets(userId)
  }, [dataRefresh, userId])

  return {
    ...dataRefresh,
    onTransactionChange,
    onCategoryChange,
    onAccountChange,
    onBudgetChange,
  }
}
