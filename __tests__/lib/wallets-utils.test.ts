import { groupAccounts, effectiveBalance } from '@/lib/wallets-utils'

const acc = (over: Record<string, unknown>) =>
  ({ id: 'x', name: 'A', type: 'BANK', balance: 100, currency: 'IDR', ...over }) as never

describe('effectiveBalance', () => {
  it('prefers currentBalanceInBase, then currentBalance, then balance', () => {
    expect(effectiveBalance(acc({ balance: 5, currentBalance: 10, currentBalanceInBase: 7 }))).toBe(7)
    expect(effectiveBalance(acc({ balance: 5, currentBalance: 10 }))).toBe(10)
    expect(effectiveBalance(acc({ balance: 5 }))).toBe(5)
  })
})

describe('groupAccounts', () => {
  it('maps types to groups in fixed order and omits empty groups', () => {
    const groups = groupAccounts([
      acc({ id: 'inv', type: 'INVESTMENT' }),
      acc({ id: 'bank', type: 'BANK' }),
      acc({ id: 'wal', type: 'DIGITAL_WALLET' }),
      acc({ id: 'cc', type: 'CREDIT_CARD', balance: -50 }),
      acc({ id: 'house', type: 'PROPERTY' }),
    ])
    expect(groups.map((g) => g.key)).toEqual(['bank', 'digitalWallets', 'assets', 'loans'])
    expect(groups.find((g) => g.key === 'assets')!.accounts.map((a: { id: string }) => a.id)).toEqual(['inv', 'house'])
  })

  it('routes negative-balance accounts into loans regardless of type', () => {
    const groups = groupAccounts([
      acc({ id: 'odCash', type: 'CASH', balance: -10 }),
      acc({ id: 'cash', type: 'CASH', balance: 10 }),
    ])
    expect(groups.map((g) => g.key)).toEqual(['cashOther', 'loans'])
    expect(groups.find((g) => g.key === 'loans')!.accounts.map((a: { id: string }) => a.id)).toEqual(['odCash'])
  })

  it('routes unknown types into cashOther and keeps input order within groups', () => {
    const groups = groupAccounts([
      acc({ id: 'u1', type: 'SOMETHING_NEW' }),
      acc({ id: 'o1', type: 'OTHER' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('cashOther')
    expect(groups[0].accounts.map((a: { id: string }) => a.id)).toEqual(['u1', 'o1'])
  })

  it('returns empty array for no accounts', () => {
    expect(groupAccounts([])).toEqual([])
  })
})

import { buildAccountPayload, deriveMortgage } from '@/lib/wallets-utils'

describe('buildAccountPayload', () => {
  it('fills every nullable column and applies defaults', () => {
    const p = buildAccountPayload('user-1', { name: 'GoPay', type: 'DIGITAL_WALLET', balance: 50000 })
    expect(p).toMatchObject({
      user_id: 'user-1', name: 'GoPay', type: 'DIGITAL_WALLET', balance: 50000,
      currency: 'IDR', is_default: false, is_active: true,
      description: null, property_type: null, asset_location: null,
      depreciation_rate: null, monthly_payment: null, mortgage_end_date: null,
      purchase_date: null, credit_limit: null, statement_day: null, due_day: null,
      vehicle_type: null, broker: null, interest_rate: null,
      loan_term_months: null, down_payment: null, investment_goal: null,
    })
  })
  it('passes through provided extras', () => {
    const p = buildAccountPayload('u', { name: 'Card', type: 'CREDIT_CARD', credit_limit: 5_000_000, statement_day: 25, due_day: 15 })
    expect(p.credit_limit).toBe(5_000_000)
    expect(p.statement_day).toBe(25)
    expect(p.balance).toBe(0)
  })
})

describe('deriveMortgage', () => {
  const input = {
    propertyName: 'House — Depok',
    currentValue: 850_000_000,
    downPayment: 250_000_000,
    interestRate: 7.5,
    monthlyPayment: 5_000_000,
    loanTermYears: 15,
    purchaseDate: '2024-05-01',
  }
  it('derives the liability account fields', () => {
    const m = deriveMortgage(input)
    expect(m).toEqual({
      name: 'House — Depok — Mortgage',
      balance: -600_000_000,
      monthly_payment: 5_000_000,
      interest_rate: 7.5,
      loan_term_months: 180,
      mortgage_end_date: '2039-05-01',
    })
  })
  it('clamps the end date to a valid day of month', () => {
    // Jan 31 + 1y term lands on Jan 31 next year (no clamp needed); Feb edge:
    const m = deriveMortgage({ ...input, purchaseDate: '2024-02-29', loanTermYears: 1 })
    expect(m.mortgage_end_date).toBe('2025-02-28')
  })
})
