import { lotsToShares, sharesToLots, type AssetClass } from '@/lib/portfolio-utils'

const isIdx = (ac: AssetClass) => ac === ('IDX_STOCK' as AssetClass)
const round2 = (n: number) => Math.round(n * 100) / 100

export function lotsOrUnitsToBase(qty: number, assetClass: AssetClass): number {
  return isIdx(assetClass) ? lotsToShares(qty) : qty
}

export function baseToLotsOrUnits(baseQty: number, assetClass: AssetClass): number {
  return isIdx(assetClass) ? sharesToLots(baseQty) : baseQty
}

export function estimatedTotal(baseQty: number, price: number): number {
  return round2(baseQty * price)
}

export function canSell(sellBaseQty: number, holdingQuantity: number): boolean {
  return sellBaseQty > 0 && sellBaseQty <= holdingQuantity
}

export function tradeFormToPayload(
  input: { quantity: number; price_per_unit: number; transaction_date: string },
  assetClass: AssetClass
): { quantity: number; price_per_unit: number; transaction_date: string } {
  return {
    quantity: lotsOrUnitsToBase(input.quantity, assetClass),
    price_per_unit: input.price_per_unit,
    transaction_date: input.transaction_date,
  }
}
