'use client'

import { useQuery } from '@tanstack/react-query'

/**
 * Fetch FX rates from each distinct non-base currency → base via `/api/exchange-rates`.
 * Returns a map keyed by uppercase currency code (e.g. `{ USD: 16250 }`). The query is
 * disabled when every value is already in the base currency. A failed/unsupported rate
 * falls back to 1 (no conversion) rather than rejecting the whole batch.
 */
export function useExchangeRates(currencies: string[], base = 'IDR') {
  const baseUpper = base.toUpperCase()
  const wanted = [...new Set(currencies.map((c) => c.toUpperCase()))]
    .filter((c) => c !== baseUpper)
    .sort()

  return useQuery({
    queryKey: ['exchange-rates', baseUpper, wanted.join(',')],
    queryFn: async () => {
      const pairs = await Promise.all(
        wanted.map(async (cur) => {
          try {
            const res = await fetch(`/api/exchange-rates?from=${cur}&to=${baseUpper}`)
            if (!res.ok) return [cur, 1] as const
            const { rate } = await res.json()
            return [cur, typeof rate === 'number' && Number.isFinite(rate) ? rate : 1] as const
          } catch {
            return [cur, 1] as const
          }
        })
      )
      return Object.fromEntries(pairs) as Record<string, number>
    },
    enabled: wanted.length > 0,
    staleTime: 6 * 60 * 60 * 1000, // 6h — matches the server-side rate cache TTL
  })
}
