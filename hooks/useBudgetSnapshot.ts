'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getBudgetSnapshot,
  type BudgetSnapshotWithSpending,
} from '@/lib/api/budget-snapshots'

interface UseBudgetSnapshotReturn {
  snapshot: BudgetSnapshotWithSpending | null
  isLoading: boolean
  error: string | null
  noSnapshot: boolean
  refetch: () => Promise<void>
}

export function useBudgetSnapshot(
  period: 'monthly' | 'yearly',
  year: number,
  month?: number,
  enabled: boolean = true
): UseBudgetSnapshotReturn {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<BudgetSnapshotWithSpending | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noSnapshot, setNoSnapshot] = useState(false)
  const requestIdRef = useRef(0)

  const fetchSnapshot = useCallback(async () => {
    if (!user?.id || !year || !enabled) return

    const currentRequestId = ++requestIdRef.current

    try {
      setIsLoading(true)
      setError(null)
      setNoSnapshot(false)

      const data = await getBudgetSnapshot(user.id, period, year, month)

      // Ignore stale responses from previous requests
      if (currentRequestId !== requestIdRef.current) return

      if (!data) {
        setNoSnapshot(true)
        setSnapshot(null)
      } else {
        setSnapshot(data)
      }
    } catch (err) {
      // Ignore stale errors
      if (currentRequestId !== requestIdRef.current) return

      const msg = err instanceof Error ? err.message : 'Failed to load budget snapshot'
      setError(msg)
      console.error('Error fetching budget snapshot:', err)
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [user?.id, period, year, month, enabled])

  useEffect(() => {
    if (enabled) {
      fetchSnapshot()
    }
  }, [fetchSnapshot, enabled])

  return {
    snapshot,
    isLoading,
    error,
    noSnapshot,
    refetch: fetchSnapshot,
  }
}
