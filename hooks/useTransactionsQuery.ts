'use client'

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Transaction, TransactionInsert, TransactionUpdate } from '@/types/database'
import { toast } from 'sonner'

const PAGE_SIZE = 100 // Load 100 transactions per page

interface TransactionPage {
  transactions: Transaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

interface UseTransactionsQueryOptions {
  userId: string
  enabled?: boolean
  startDate?: string
  endDate?: string
  categoryId?: string
}

/**
 * Fetch a single page of transactions
 */
async function fetchTransactionsPage(
  userId: string,
  page: number,
  options?: {
    startDate?: string
    endDate?: string
    categoryId?: string
  }
): Promise<TransactionPage> {
  const params = new URLSearchParams({
    userId,
    page: page.toString(),
    limit: PAGE_SIZE.toString(),
    sortBy: 'date',
    sortOrder: 'desc',
  })

  if (options?.startDate) params.append('startDate', options.startDate)
  if (options?.endDate) params.append('endDate', options.endDate)
  if (options?.categoryId) params.append('categoryId', options.categoryId)

  const response = await fetch(`/api/transactions?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch transactions')
  }

  return response.json()
}

/**
 * React Query hook for transactions with automatic pagination
 *
 * This hook:
 * - Automatically loads all pages of transactions
 * - Caches results efficiently
 * - Provides a flat array that feels like all data is loaded
 * - Invalidates cache on mutations
 */
export function useTransactionsQuery(options: UseTransactionsQueryOptions) {
  const { userId, enabled = true, startDate, endDate, categoryId } = options

  const query = useInfiniteQuery({
    queryKey: ['transactions', userId, { startDate, endDate, categoryId }],
    queryFn: ({ pageParam = 1 }) =>
      fetchTransactionsPage(userId, pageParam, { startDate, endDate, categoryId }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    enabled: enabled && !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Flatten all pages into a single array
  const transactions = query.data?.pages.flatMap((page) => page.transactions) ?? []

  // Calculate total count
  const totalCount = query.data?.pages[0]?.pagination.total ?? 0

  return {
    transactions,
    totalCount,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  }
}

/**
 * Hook to load all transaction pages automatically in the background
 * This makes the UX feel instant while still being efficient
 */
export function useAllTransactions(options: UseTransactionsQueryOptions) {
  const query = useTransactionsQuery(options)

  // Automatically fetch all pages in the background
  if (query.hasNextPage && !query.isFetchingNextPage && !query.isLoading) {
    // Use setTimeout to avoid blocking the main thread
    setTimeout(() => {
      query.fetchNextPage()
    }, 100)
  }

  return {
    transactions: query.transactions,
    totalCount: query.totalCount,
    isLoading: query.isLoading || (query.hasNextPage && query.transactions.length > 0),
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Mutation hooks for transactions
 */
export function useTransactionMutations(userId: string) {
  const queryClient = useQueryClient()

  const invalidateTransactions = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
  }

  const createMutation = useMutation({
    mutationFn: async (data: TransactionInsert) => {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create transaction')
      }

      return response.json()
    },
    onSuccess: () => {
      invalidateTransactions()
      toast.success('Transaction added successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransactionUpdate }) => {
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update transaction')
      }

      return response.json()
    },
    onSuccess: () => {
      invalidateTransactions()
      toast.success('Transaction updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete transaction')
      }
    },
    onSuccess: () => {
      invalidateTransactions()
      toast.success('Transaction deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
