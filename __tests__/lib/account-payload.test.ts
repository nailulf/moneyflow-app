import { sanitizeAccountPayload } from '@/lib/account-payload'

describe('sanitizeAccountPayload', () => {
  const base = { name: 'BCA Savings' }

  it('applies defaults: BANK type, 0 balance, IDR, nullable fields null', () => {
    const r = sanitizeAccountPayload(base)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data).toMatchObject({
      name: 'BCA Savings', type: 'BANK', balance: 0, currency: 'IDR',
      is_default: false, description: null, credit_limit: null,
      statement_day: null, due_day: null, vehicle_type: null, broker: null,
      interest_rate: null, loan_term_months: null, down_payment: null,
      investment_goal: null, purchase_date: null,
    })
  })

  it('accepts DIGITAL_WALLET and uppercases lowercase types', () => {
    expect(sanitizeAccountPayload({ ...base, type: 'digital_wallet' })).toMatchObject({
      ok: true, data: expect.objectContaining({ type: 'DIGITAL_WALLET' }),
    })
  })

  it('rejects unknown types, missing/blank names', () => {
    expect(sanitizeAccountPayload({ ...base, type: 'CRYPTO' }).ok).toBe(false)
    expect(sanitizeAccountPayload({}).ok).toBe(false)
    expect(sanitizeAccountPayload({ name: '   ' }).ok).toBe(false)
  })

  it('validates day-of-month bounds and vehicle type', () => {
    expect(sanitizeAccountPayload({ ...base, statement_day: 0 }).ok).toBe(false)
    expect(sanitizeAccountPayload({ ...base, statement_day: 32 }).ok).toBe(false)
    expect(sanitizeAccountPayload({ ...base, due_day: 15 })).toMatchObject({
      ok: true, data: expect.objectContaining({ due_day: 15 }),
    })
    expect(sanitizeAccountPayload({ ...base, vehicle_type: 'BOAT' }).ok).toBe(false)
    expect(sanitizeAccountPayload({ ...base, vehicle_type: 'CAR' })).toMatchObject({
      ok: true, data: expect.objectContaining({ vehicle_type: 'CAR' }),
    })
  })

  it('rejects negative money/rate fields and non-positive loan terms', () => {
    expect(sanitizeAccountPayload({ ...base, credit_limit: -1 }).ok).toBe(false)
    expect(sanitizeAccountPayload({ ...base, interest_rate: -0.1 }).ok).toBe(false)
    expect(sanitizeAccountPayload({ ...base, down_payment: -5 }).ok).toBe(false)
    expect(sanitizeAccountPayload({ ...base, loan_term_months: 0 }).ok).toBe(false)
    expect(sanitizeAccountPayload({ ...base, loan_term_months: 240 })).toMatchObject({
      ok: true, data: expect.objectContaining({ loan_term_months: 240 }),
    })
  })

  it('pins boundary coercions: string balance, NaN balance, string is_default, currency casing', () => {
    expect(sanitizeAccountPayload({ ...base, balance: '1000' })).toMatchObject({
      ok: true, data: expect.objectContaining({ balance: 1000 }),
    })
    expect(sanitizeAccountPayload({ ...base, balance: 'abc' }).ok).toBe(false)
    expect(sanitizeAccountPayload({ ...base, is_default: 'true' })).toMatchObject({
      ok: true, data: expect.objectContaining({ is_default: false }),
    })
    expect(sanitizeAccountPayload({ ...base, currency: 'idr' })).toMatchObject({
      ok: true, data: expect.objectContaining({ currency: 'IDR' }),
    })
    expect(sanitizeAccountPayload({ ...base, currency: 'XYZ' }).ok).toBe(false)
  })

  it('passes through legacy asset fields and trims strings', () => {
    const r = sanitizeAccountPayload({
      ...base, name: '  House — Depok  ', property_type: 'HOUSE',
      asset_location: 'Depok', depreciation_rate: 15, monthly_payment: 2500000,
      mortgage_end_date: '2040-01-01', broker: '  Stockbit ', investment_goal: 'Capital Gain',
      purchase_date: '2024-05-01',
    })
    expect(r).toMatchObject({
      ok: true,
      data: expect.objectContaining({
        name: 'House — Depok', property_type: 'HOUSE', broker: 'Stockbit',
        investment_goal: 'Capital Gain', purchase_date: '2024-05-01',
      }),
    })
  })
})
