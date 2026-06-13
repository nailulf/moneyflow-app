import { holdingFormSchema, toHoldingPayload, type HoldingFormOutput } from '@/lib/validations-holding'

describe('holdingFormSchema', () => {
  const base = { name: 'Bank Central Asia', symbol: 'BBCA', quantity: '1', purchase_price: '9500', purchase_date: '2026-06-01', currency: 'IDR' }

  it('accepts a valid form and coerces numbers', () => {
    const r = holdingFormSchema.safeParse(base)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toMatchObject({ name: 'Bank Central Asia', symbol: 'BBCA', quantity: 1, purchase_price: 9500, currency: 'IDR' })
  })
  it('rejects blank name with the i18n key', () => {
    const r = holdingFormSchema.safeParse({ ...base, name: '  ' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('nameRequired')
  })
  it('rejects non-positive quantity and negative price', () => {
    expect(holdingFormSchema.safeParse({ ...base, quantity: '0' }).success).toBe(false)
    expect(holdingFormSchema.safeParse({ ...base, purchase_price: '-1' }).success).toBe(false)
  })
  it('treats empty symbol/date as optional', () => {
    const r = holdingFormSchema.safeParse({ ...base, symbol: '', purchase_date: '' })
    expect(r.success).toBe(true)
  })
})

describe('toHoldingPayload', () => {
  const form: HoldingFormOutput = { name: 'BBCA', symbol: 'BBCA', quantity: 2, purchase_price: 9500, purchase_date: '2026-06-01', currency: 'IDR' }

  it('IDX_STOCK: quantity is lots → shares (×100), current_value = shares × price', () => {
    const p = toHoldingPayload(form, 'IDX_STOCK')
    expect(p).toEqual({
      asset_class: 'IDX_STOCK', symbol: 'BBCA', name: 'BBCA',
      quantity: 200, purchase_price: 9500, current_value: 1900000,
      purchase_date: '2026-06-01', currency: 'IDR',
    })
  })
  it('non-IDX: quantity is units as-is, current_value = units × price', () => {
    const p = toHoldingPayload({ ...form, quantity: 3, purchase_price: 100 }, 'US_STOCK')
    expect(p).toMatchObject({ asset_class: 'US_STOCK', quantity: 3, current_value: 300 })
  })
  it('empty symbol/date become null', () => {
    const p = toHoldingPayload({ ...form, symbol: '', purchase_date: '' }, 'BOND')
    expect(p.symbol).toBeNull()
    expect(p.purchase_date).toBeNull()
  })
})
