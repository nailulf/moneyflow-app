import {
  SHARES_PER_LOT, lotsToShares, sharesToLots,
  costBasis, gainLoss, gainLossPct,
  portfolioTotals, allocation, groupHoldingsByClass,
  convertHoldingsToBase, defaultCurrencyForClass,
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

describe('defaultCurrencyForClass', () => {
  it('uses USD for US-listed classes and IDR otherwise', () => {
    expect(defaultCurrencyForClass('US_STOCK')).toBe('USD')
    expect(defaultCurrencyForClass('ETF')).toBe('USD')
    expect(defaultCurrencyForClass('IDX_STOCK')).toBe('IDR')
    expect(defaultCurrencyForClass('MUTUAL_FUND')).toBe('IDR')
    expect(defaultCurrencyForClass('BOND')).toBe('IDR')
    expect(defaultCurrencyForClass('OTHER')).toBe('IDR')
  })
})

describe('convertHoldingsToBase', () => {
  const rates = { USD: 16000 }
  it('scales current_value + purchase_price of non-base holdings and relabels currency', () => {
    const [r] = convertHoldingsToBase([h({ currency: 'USD', current_value: 800, purchase_price: 100 })], rates, 'IDR')
    expect(r).toMatchObject({ currency: 'IDR', current_value: 12800000, purchase_price: 1600000 })
  })
  it('passes base-currency holdings through untouched', () => {
    const input = h({ currency: 'IDR', current_value: 5000000 })
    expect(convertHoldingsToBase([input], rates, 'IDR')[0]).toBe(input)
  })
  it('leaves a holding in its native currency when its rate is missing (rates not loaded)', () => {
    const input = h({ currency: 'USD', current_value: 800 })
    expect(convertHoldingsToBase([input], undefined, 'IDR')[0]).toBe(input)
  })
})

import { sanitizeHoldingPayload } from '@/lib/portfolio-utils'

describe('sanitizeHoldingPayload', () => {
  const base = { asset_class: 'IDX_STOCK', name: 'BBCA', quantity: 100, purchase_price: 9000, current_value: 990000 }

  it('accepts a valid payload, trims strings, defaults currency to IDR', () => {
    const r = sanitizeHoldingPayload({ ...base, symbol: '  BBCA ', name: ' Bank Central Asia ' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toMatchObject({
      asset_class: 'IDX_STOCK', symbol: 'BBCA', name: 'Bank Central Asia',
      quantity: 100, purchase_price: 9000, current_value: 990000, currency: 'IDR', purchase_date: null,
    })
  })

  it('coerces numeric strings and keeps a provided supported currency', () => {
    const r = sanitizeHoldingPayload({ ...base, quantity: '50', purchase_price: '10000', current_value: '480000', currency: 'usd' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toMatchObject({ quantity: 50, purchase_price: 10000, current_value: 480000, currency: 'USD' })
  })

  it('rejects unknown asset class, blank name, non-positive quantity, negative money, bad currency', () => {
    expect(sanitizeHoldingPayload({ ...base, asset_class: 'CRYPTO' }).ok).toBe(false)
    expect(sanitizeHoldingPayload({ ...base, name: '   ' }).ok).toBe(false)
    expect(sanitizeHoldingPayload({ ...base, quantity: 0 }).ok).toBe(false)
    expect(sanitizeHoldingPayload({ ...base, quantity: -1 }).ok).toBe(false)
    expect(sanitizeHoldingPayload({ ...base, purchase_price: -1 }).ok).toBe(false)
    expect(sanitizeHoldingPayload({ ...base, current_value: -1 }).ok).toBe(false)
    expect(sanitizeHoldingPayload({ ...base, currency: 'XYZ' }).ok).toBe(false)
  })

  it('null symbol/purchase_date pass through; empty symbol becomes null', () => {
    const r = sanitizeHoldingPayload({ ...base, symbol: '', purchase_date: '2026-06-01' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toMatchObject({ symbol: null, purchase_date: '2026-06-01' })
  })

  it('partial=true validates only provided keys and forbids account_id', () => {
    const ok = sanitizeHoldingPayload({ current_value: 1000000 }, { partial: true })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.data).toEqual({ current_value: 1000000 })
    expect(sanitizeHoldingPayload({ account_id: 'other' }, { partial: true }).ok).toBe(false)
  })
})
