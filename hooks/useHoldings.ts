'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useAccounts } from '@/contexts/AccountContext'
import { listHoldings, type Holding } from '@/lib/api/holdings'

/** Holdings for one account. */
export function useHoldings(accountId: string | null) {
  return useQuery({
    queryKey: ['holdings', accountId],
    queryFn: () => listHoldings(accountId!),
    enabled: !!accountId,
  })
}

export interface AllHoldings {
  holdings: Holding[]
  isLoading: boolean
}

/** Holdings across every INVESTMENT account (for the portfolio root). */
export function useAllHoldings(): AllHoldings {
  const { user } = useAuth()
  const { accounts } = useAccounts()
  const investmentIds = accounts.filter((a) => a.type === 'INVESTMENT').map((a) => a.id)
  const query = useQuery({
    queryKey: ['all-holdings', user?.id, investmentIds.sort().join(',')],
    queryFn: async () => {
      const lists = await Promise.all(investmentIds.map((id) => listHoldings(id)))
      return lists.flat()
    },
    enabled: !!user?.id && investmentIds.length > 0,
  })
  return { holdings: query.data ?? [], isLoading: query.isLoading }
}
