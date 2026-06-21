import type { HoldingLike } from '@/lib/portfolio-utils'
import { sharesToLots, type AssetClass } from '@/lib/portfolio-utils'

/** The n holdings with the highest current value (desc). */
export function topHoldings<H extends HoldingLike>(holdings: H[], n: number): H[] {
  return [...holdings].sort((a, b) => b.current_value - a.current_value).slice(0, n)
}

export function hasInvestmentAccounts(accounts: { type: string }[]): boolean {
  return accounts.some((a) => a.type === 'INVESTMENT')
}

export function isEmptyAccount(holdings: unknown[]): boolean {
  return holdings.length === 0
}

export function assetPositionView(
  h: Pick<HoldingLike, 'asset_class' | 'quantity' | 'purchase_price' | 'current_value' | 'currency'>
): { avgBuyPrice: number; bookValue: number; quantityLabel: string; gainPlaceholder: true } {
  const isIdx = h.asset_class === ('IDX_STOCK' as AssetClass)
  const qty = isIdx ? sharesToLots(h.quantity) : h.quantity
  const unit = isIdx ? 'lots' : 'units'
  return {
    avgBuyPrice: h.purchase_price,
    bookValue: h.current_value,
    quantityLabel: `${qty} ${unit}`,
    gainPlaceholder: true,
  }
}

export function txnRowView(
  t: { type: 'BUY' | 'SELL' | 'DIVIDEND'; quantity: number; total_amount: number; transaction_date: string }
): { typeKey: string; signedQuantity: string; total: number; date: string } {
  const typeKey = t.type === 'BUY' ? 'history.buy' : t.type === 'SELL' ? 'history.sell' : 'history.dividend'
  const sign = t.type === 'SELL' ? '−' : '+'
  return { typeKey, signedQuantity: `${sign}${t.quantity}`, total: t.total_amount, date: t.transaction_date }
}
