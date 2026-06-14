'use client'

import { useMemo } from 'react'
import { useExchangeRates } from './useExchangeRates'
import { convertHoldingsToBase, type HoldingLike } from '@/lib/portfolio-utils'

/**
 * Holdings with their monetary fields converted into `base` currency (default IDR), so totals,
 * allocation, and ranking are computed in one consistent base rather than naively summing mixed
 * currencies. Ids are preserved, so callers can map a converted row back to the original holding.
 */
export function useHoldingsInBase<H extends HoldingLike>(holdings: H[], base = 'IDR'): H[] {
  const { data: rates } = useExchangeRates(holdings.map((h) => h.currency), base)
  return useMemo(() => convertHoldingsToBase(holdings, rates, base), [holdings, rates, base])
}
