import { lotsOrUnitsToBase, baseToLotsOrUnits, estimatedTotal, canSell, tradeFormToPayload } from '@/lib/portfolio-trade-form'

describe('portfolio-trade-form', () => {
  it('converts IDX lots to shares and back', () => {
    expect(lotsOrUnitsToBase(2, 'IDX_STOCK')).toBe(200)
    expect(lotsOrUnitsToBase(100, 'MUTUAL_FUND')).toBe(100)
    expect(baseToLotsOrUnits(200, 'IDX_STOCK')).toBe(2)
  })
  it('estimatedTotal is base qty × price, rounded to 2dp', () => {
    expect(estimatedTotal(200, 9500)).toBe(1_900_000)
  })
  it('canSell allows ≤ holding, blocks more', () => {
    expect(canSell(200, 200)).toBe(true)
    expect(canSell(201, 200)).toBe(false)
  })
  it('tradeFormToPayload converts IDX lots to base units', () => {
    expect(tradeFormToPayload({ quantity: 2, price_per_unit: 9500, transaction_date: '2026-06-01' }, 'IDX_STOCK'))
      .toEqual({ quantity: 200, price_per_unit: 9500, transaction_date: '2026-06-01' })
  })
})
