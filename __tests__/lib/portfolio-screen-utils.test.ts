import { topHoldings } from '@/lib/portfolio-screen-utils'
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
