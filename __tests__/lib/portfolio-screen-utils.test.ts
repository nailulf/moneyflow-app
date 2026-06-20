import {
  topHoldings, hasInvestmentAccounts, isEmptyAccount, assetPositionView, txnRowView,
} from '@/lib/portfolio-screen-utils'
import type { HoldingLike } from '@/lib/portfolio-utils'

const h = (id: string, value: number, over: Partial<HoldingLike> = {}): HoldingLike => ({
  id, account_id: 'a', asset_class: 'IDX_STOCK', symbol: id, name: id,
  quantity: 1, purchase_price: value, current_value: value, currency: 'IDR', ...over,
})

describe('topHoldings', () => {
  it('returns the n highest-value holdings, desc', () => {
    const list = [h('a', 100), h('b', 500), h('c', 300)]
    expect(topHoldings(list, 2).map((x) => x.id)).toEqual(['b', 'c'])
  })
  it('returns all when fewer than n', () => {
    expect(topHoldings([h('a', 1)], 5)).toHaveLength(1)
  })
})

describe('hasInvestmentAccounts', () => {
  it('is true when any account is INVESTMENT', () => {
    expect(hasInvestmentAccounts([{ type: 'BANK' }, { type: 'INVESTMENT' }])).toBe(true)
  })
  it('is false otherwise', () => {
    expect(hasInvestmentAccounts([{ type: 'BANK' }])).toBe(false)
    expect(hasInvestmentAccounts([])).toBe(false)
  })
})

describe('isEmptyAccount', () => {
  it('is true for no holdings', () => {
    expect(isEmptyAccount([])).toBe(true)
    expect(isEmptyAccount([{}])).toBe(false)
  })
})

describe('assetPositionView', () => {
  it('shows lots for IDX_STOCK and book value, with gain placeholder', () => {
    const v = assetPositionView({ asset_class: 'IDX_STOCK', quantity: 200, purchase_price: 9500, current_value: 1_900_000, currency: 'IDR' })
    expect(v.avgBuyPrice).toBe(9500)
    expect(v.bookValue).toBe(1_900_000)
    expect(v.quantityLabel).toBe('2 lots')
    expect(v.gainPlaceholder).toBe(true)
  })
  it('shows units for non-IDX', () => {
    const v = assetPositionView({ asset_class: 'MUTUAL_FUND', quantity: 100, purchase_price: 1000, current_value: 100_000, currency: 'IDR' })
    expect(v.quantityLabel).toBe('100 units')
  })
})

describe('txnRowView', () => {
  it('formats a BUY row', () => {
    const r = txnRowView({ type: 'BUY', quantity: 100, total_amount: 950_000, transaction_date: '2026-06-01' })
    expect(r.typeKey).toBe('history.buy')
    expect(r.signedQuantity).toBe('+100')
    expect(r.total).toBe(950_000)
    expect(r.date).toBe('2026-06-01')
  })
  it('formats a SELL row with a negative quantity', () => {
    expect(txnRowView({ type: 'SELL', quantity: 50, total_amount: 600_000, transaction_date: '2026-06-02' }).signedQuantity).toBe('−50')
  })
})
