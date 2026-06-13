import {
  SHARES_PER_LOT, lotsToShares, sharesToLots,
  costBasis, gainLoss, gainLossPct,
  portfolioTotals, allocation, groupHoldingsByClass,
  type HoldingLike,
} from '@/lib/portfolio-utils'

const h = (over: Partial<HoldingLike>): HoldingLike => ({
  id: 'x', account_id: 'a', asset_class: 'IDX_STOCK', symbol: 'BBCA',
  name: 'Bank Central Asia', quantity: 100, purchase_price: 9000,
  current_value: 990000, currency: 'IDR',
  ...over,
})

describe('lots <-> shares', () => {
  it('IDX lot is 100 shares', () => {
    expect(SHARES_PER_LOT).toBe(100)
    expect(lotsToShares(3)).toBe(300)
    expect(sharesToLots(300)).toBe(3)
    expect(sharesToLots(150)).toBe(1.5)
  })
})

describe('costBasis / gainLoss', () => {
  it('cost basis = quantity * purchase_price', () => {
    expect(costBasis(h({ quantity: 100, purchase_price: 9000 }))).toBe(900000)
  })
  it('gainLoss = current_value - cost basis (can be negative)', () => {
    expect(gainLoss(h({ quantity: 100, purchase_price: 9000, current_value: 990000 }))).toBe(90000)
    expect(gainLoss(h({ quantity: 100, purchase_price: 9000, current_value: 800000 }))).toBe(-100000)
  })
  it('gainLossPct relative to cost basis, 0 when basis is 0', () => {
    expect(gainLossPct(h({ quantity: 100, purchase_price: 9000, current_value: 990000 }))).toBe(10)
    expect(gainLossPct(h({ quantity: 1, purchase_price: 0, current_value: 500 }))).toBe(0)
  })
})

describe('portfolioTotals', () => {
  it('sums current value and gain/loss across holdings', () => {
    const list = [
      h({ id: '1', quantity: 100, purchase_price: 9000, current_value: 990000 }),   // +90k
      h({ id: '2', quantity: 50, purchase_price: 10000, current_value: 480000 }),   // -20k
    ]
    expect(portfolioTotals(list)).toEqual({ totalValue: 1470000, totalCostBasis: 1400000, totalGainLoss: 70000, totalGainLossPct: 5 })
  })
  it('handles an empty portfolio', () => {
    expect(portfolioTotals([])).toEqual({ totalValue: 0, totalCostBasis: 0, totalGainLoss: 0, totalGainLossPct: 0 })
  })
})

describe('allocation', () => {
  it('returns per-class share of total current value, desc, rounded to 1 decimal', () => {
    const list = [
      h({ id: '1', asset_class: 'IDX_STOCK', current_value: 750000 }),
      h({ id: '2', asset_class: 'MUTUAL_FUND', current_value: 250000 }),
    ]
    expect(allocation(list)).toEqual([
      { assetClass: 'IDX_STOCK', value: 750000, pct: 75 },
      { assetClass: 'MUTUAL_FUND', value: 250000, pct: 25 },
    ])
  })
  it('is empty for no holdings', () => {
    expect(allocation([])).toEqual([])
  })
})

describe('groupHoldingsByClass', () => {
  it('groups by asset class in a fixed order, omitting empty classes, with per-class totals', () => {
    const list = [
      h({ id: '1', asset_class: 'MUTUAL_FUND', current_value: 250000 }),
      h({ id: '2', asset_class: 'IDX_STOCK', current_value: 990000 }),
      h({ id: '3', asset_class: 'IDX_STOCK', current_value: 500000 }),
    ]
    const groups = groupHoldingsByClass(list)
    expect(groups.map((g) => g.assetClass)).toEqual(['IDX_STOCK', 'MUTUAL_FUND'])
    expect(groups[0].total).toBe(1490000)
    expect(groups[0].holdings.map((x) => x.id)).toEqual(['2', '3'])
  })
})
