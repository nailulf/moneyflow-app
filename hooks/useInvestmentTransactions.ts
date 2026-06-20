'use client'

import { useQuery } from '@tanstack/react-query'
import { listTransactions } from '@/lib/api/investment-transactions'

/** Ledger for one holding. */
export function useInvestmentTransactions(accountId: string | null, holdingId: string | null) {
  return useQuery({
    queryKey: ['investment-transactions', accountId, holdingId],
    queryFn: () => listTransactions(accountId!, holdingId!),
    enabled: !!accountId && !!holdingId,
  })
}
