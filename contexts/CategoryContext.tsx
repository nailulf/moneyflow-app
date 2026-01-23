'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getUserCategories } from '@/lib/api/categories'
import { CategoryDB } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

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

  const [categories, setCategories] = useState<CategoryDB[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCategories = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      setError(null)
      const userCategories = await getUserCategories(userId)
      setCategories(userCategories)
    } catch (err) {
      console.error('Error loading categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const refreshCategories = async () => {
    await loadCategories()
  }

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.name || 'Unknown Category'
  }

  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.color || 'hsl(var(--muted-foreground))'
  }

  useEffect(() => {
    loadCategories()
  }, [userId])

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