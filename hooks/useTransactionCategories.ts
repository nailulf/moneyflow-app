'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/useDataRefresh'
import { invalidateCategoriesCache } from '@/lib/api/categories'
import type { CategoryDB } from '@/types/database'
import type { TxnType } from '@/lib/transaction-form'

// Picker-compatible shape consumed by CategoryPickerSheet / TransactionForm.
export interface PickerCategory {
  id: string
  name: string
  group_type: string
}

// Fetch the user's categories straight from the API. Unlike the category-manager
// pipeline (which joins categories onto category_groups via `category_group_id`),
// this keeps every active category and groups by the `group_type` column directly —
// so categories with a null `category_group_id` still show up in the picker.
async function fetchCategories(userId: string): Promise<CategoryDB[]> {
  const res = await fetch(`/api/categories?userId=${userId}`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

/**
 * Categories for the transaction add/edit flow, plus an `addCategory` mutation.
 *
 * Source of truth is `group_type` (not the category_group_id join), which makes
 * the picker resilient to legacy/unlinked rows. New categories are created with
 * `group_type` set and no group link, matching the existing data shape.
 */
export function useTransactionCategories(userId: string | undefined) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.categories(userId),
    queryFn: () => fetchCategories(userId as string),
    enabled: !!userId,
    staleTime: 30_000,
  })

  const categories: PickerCategory[] = useMemo(
    () =>
      (data ?? [])
        .filter((c) => c.is_active !== false)
        .map((c) => ({ id: c.id, name: c.name, group_type: c.group_type })),
    [data],
  )

  const addMutation = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: TxnType }): Promise<CategoryDB> => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), group_type: type, is_custom: true }),
      })
      if (!res.ok) throw new Error('Failed to create category')
      return res.json()
    },
    onSuccess: () => {
      // React Query's invalidate doesn't reach the in-memory dedup cache in
      // lib/api/categories — clear it too so other readers refetch.
      invalidateCategoriesCache(userId)
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(userId) })
    },
  })

  /** Create a category and return its id (or null on failure). */
  const addCategory = async (name: string, type: TxnType): Promise<string | null> => {
    const created = await addMutation.mutateAsync({ name, type })
    return created?.id ?? null
  }

  return {
    categories,
    isLoading,
    error,
    addCategory,
    isAdding: addMutation.isPending,
  }
}
