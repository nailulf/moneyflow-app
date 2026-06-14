import type { HoldingLike } from '@/lib/portfolio-utils'

/** The n holdings with the highest current value (desc). */
export function topHoldings<H extends HoldingLike>(holdings: H[], n: number): H[] {
  return [...holdings].sort((a, b) => b.current_value - a.current_value).slice(0, n)
}
