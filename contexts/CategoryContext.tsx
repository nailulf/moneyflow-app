'use client'

import React, { createContext, useContext, ReactNode, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserCategories } from '@/lib/api/categories'
import { CategoryDB } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { queryKeys } from '@/hooks/useDataRefresh'

interface CategoryContextType {
  categories: CategoryDB[]
  loading: boolean
  error: string | null
  refreshCategories: () => Promise<void>
  getCategoryName: (categoryId: string) => string
  getCategoryColor: (categoryId: string) => string
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined)

interface CategoryProviderProps {
  children: ReactNode
}

export function CategoryProvider({ children }: CategoryProviderProps) {
  const { user } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()

  // Use React Query for categories with automatic caching and invalidation
  const {
    data: categories = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.categories(userId),
    queryFn: () => getUserCategories(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load categories') : null

  const refreshCategories = useCallback(async () => {
    // Invalidate and refetch categories
    await queryClient.invalidateQueries({ queryKey: queryKeys.categories(userId) })
    await refetch()
  }, [queryClient, userId, refetch])

  const getCategoryName = useCallback((categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.name || 'Unknown Category'
  }, [categories])

  const getCategoryColor = useCallback((categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.color || 'hsl(var(--muted-foreground))'
  }, [categories])

  const value: CategoryContextType = {
    categories,
    loading,
    error,
    refreshCategories,
    getCategoryName,
    getCategoryColor
  }

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  )
}

export function useCategories() {
  const context = useContext(CategoryContext)
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoryProvider')
  }
  return context
}
