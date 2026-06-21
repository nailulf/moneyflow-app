import {
  recomputeFromLedger,
  realizedPl,
  sanitizeTxnPayload,
} from '@/lib/investment-ledger'

describe('recomputeFromLedger', () => {
  it('averages cost across multiple buys', () => {
    const r = recomputeFromLedger([
      { type: 'BUY', quantity: 100, price_per_unit: 9000 },
      { type: 'BUY', quantity: 100, price_per_unit: 10000 },
    ])
    expect(r.quantity).toBe(200)
    expect(r.averageCost).toBe(9500)
    expect(r.bookValue).toBe(1_900_000)
  })

  it('reduces quantity on a partial sell, keeps average cost', () => {
    const r = recomputeFromLedger([
      { type: 'BUY', quantity: 100, price_per_unit: 9000 },
      { type: 'BUY', quantity: 100, price_per_unit: 10000 },
      { type: 'SELL', quantity: 50, price_per_unit: 11000 },
    ])
    expect(r.quantity).toBe(150)
    expect(r.averageCost).toBe(9500)
    expect(r.bookValue).toBe(1_425_000)
  })

  it('fully sold position is zeroed', () => {
    const r = recomputeFromLedger([
      { type: 'BUY', quantity: 100, price_per_unit: 9000 },
      { type: 'SELL', quantity: 100, price_per_unit: 12000 },
    ])
    expect(r).toEqual({ quantity: 0, averageCost: 9000, bookValue: 0 })
  })

  it('ignores DIVIDEND rows for quantity/cost', () => {
    const r = recomputeFromLedger([
      { type: 'BUY', quantity: 100, price_per_unit: 9000 },
      { type: 'DIVIDEND', quantity: 0, price_per_unit: 0 },
    ])
    expect(r.quantity).toBe(100)
    expect(r.averageCost).toBe(9000)
  })

  it('empty ledger is all zeros', () => {
    expect(recomputeFromLedger([])).toEqual({ quantity: 0, averageCost: 0, bookValue: 0 })
  })
})

describe('realizedPl', () => {
  it('is proceeds minus cost basis of sold units', () => {
    expect(realizedPl(50, 9500, 550_000)).toBe(75_000)
  })
})

describe('sanitizeTxnPayload', () => {
  it('accepts a full BUY and derives total_amount when absent', () => {
    const r = sanitizeTxnPayload({
      type: 'buy', quantity: 100, price_per_unit: 9000, transaction_date: '2026-06-01',
    })
    expect(r).toEqual({
      ok: true,
      data: {
        type: 'BUY', quantity: 100, price_per_unit: 9000, total_amount: 900_000,
        transaction_date: '2026-06-01', currency: 'IDR', notes: null, proceeds_to_cash: false,
      },
    })
  })

  it('rejects an invalid type', () => {
    expect(sanitizeTxnPayload({ type: 'gift', quantity: 1, price_per_unit: 1, transaction_date: '2026-06-01' }))
      .toEqual({ ok: false, error: 'invalid type' })
  })

  it('rejects non-positive quantity', () => {
    const r = sanitizeTxnPayload({ type: 'BUY', quantity: 0, price_per_unit: 9000, transaction_date: '2026-06-01' })
    expect(r.ok).toBe(false)
  })

  it('rejects account_id / user_id / holding_id spoofing', () => {
    expect(sanitizeTxnPayload({ type: 'BUY', quantity: 1, price_per_unit: 1, transaction_date: '2026-06-01', user_id: 'x' }).ok).toBe(false)
  })

  it('partial update validates only provided fields', () => {
    const r = sanitizeTxnPayload({ price_per_unit: 9500 }, { partial: true })
    expect(r).toEqual({ ok: true, data: { price_per_unit: 9500 } })
  })

  it('parses proceeds_to_cash boolean for a SELL', () => {
    const r = sanitizeTxnPayload({
      type: 'SELL', quantity: 10, price_per_unit: 12000, transaction_date: '2026-06-02', proceeds_to_cash: true,
    })
    expect(r.ok && r.data.proceeds_to_cash).toBe(true)
  })
  it('defaults proceeds_to_cash to false', () => {
    const r = sanitizeTxnPayload({ type: 'SELL', quantity: 10, price_per_unit: 12000, transaction_date: '2026-06-02' })
    expect(r.ok && r.data.proceeds_to_cash).toBe(false)
  })
})
