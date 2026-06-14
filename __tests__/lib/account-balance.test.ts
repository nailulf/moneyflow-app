import { transactionEffect, computeAccountBalance, type LedgerTxn } from '@/lib/account-balance'

function tx(over: Partial<LedgerTxn>): LedgerTxn {
  return { amount: 0, type: 'EXPENSE', date: '2026-01-01', account_id: 'A', to_account_id: null, currency: 'IDR', ...over }
}

describe('transactionEffect', () => {
  it('adds income, subtracts expense for the owning account', () => {
    expect(transactionEffect(tx({ type: 'INCOME', amount: 100 }), 'A')).toBe(100)
    expect(transactionEffect(tx({ type: 'EXPENSE', amount: 30 }), 'A')).toBe(-30)
  })

  it('debits the source and credits the destination of a transfer', () => {
    const t = tx({ type: 'TRANSFER', amount: 50, account_id: 'A', to_account_id: 'B' })
    expect(transactionEffect(t, 'A')).toBe(-50) // source out
    expect(transactionEffect(t, 'B')).toBe(50)  // destination in
  })

  it('ignores a legacy transfer with no destination', () => {
    const t = tx({ type: 'TRANSFER', amount: 50, account_id: 'A', to_account_id: null })
    expect(transactionEffect(t, 'A')).toBe(0)
  })
})

describe('computeAccountBalance', () => {
  it('current = opening + Σ effects', () => {
    const txns: LedgerTxn[] = [
      tx({ type: 'INCOME', amount: 1000, account_id: 'A' }),
      tx({ type: 'EXPENSE', amount: 250, account_id: 'A' }),
      tx({ type: 'TRANSFER', amount: 100, account_id: 'A', to_account_id: 'B' }),
      tx({ type: 'TRANSFER', amount: 40, account_id: 'B', to_account_id: 'A' }),
    ]
    // opening 500 + 1000 - 250 - 100 (out) + 40 (in) = 1190
    expect(computeAccountBalance({ accountId: 'A', opening: 500, transactions: txns })).toBe(1190)
  })

  it('only counts transactions on/before asOf when provided', () => {
    const txns: LedgerTxn[] = [
      tx({ type: 'INCOME', amount: 100, date: '2026-01-10', account_id: 'A' }),
      tx({ type: 'INCOME', amount: 999, date: '2026-02-10', account_id: 'A' }),
    ]
    expect(computeAccountBalance({ accountId: 'A', opening: 0, transactions: txns, asOf: new Date('2026-01-31') })).toBe(100)
  })

  it('converts foreign-currency transactions using the rate, preserving direction', () => {
    const rates = new Map<string, number>([['USD-IDR', 16000]])
    const txns: LedgerTxn[] = [
      tx({ type: 'INCOME', amount: 10, currency: 'USD', account_id: 'A' }),   // +160,000 IDR
      tx({ type: 'EXPENSE', amount: 5, currency: 'USD', account_id: 'A' }),   //  -80,000 IDR
      tx({ type: 'INCOME', amount: 1000, currency: 'IDR', account_id: 'A' }), //   +1,000 IDR (no conversion)
    ]
    expect(computeAccountBalance({
      accountId: 'A', opening: 0, transactions: txns, accountCurrency: 'IDR', currencyRates: rates,
    })).toBe(81000)
  })

  it('falls back to the raw amount when no rate is available', () => {
    const txns: LedgerTxn[] = [tx({ type: 'INCOME', amount: 7, currency: 'EUR', account_id: 'A' })]
    expect(computeAccountBalance({
      accountId: 'A', opening: 0, transactions: txns, accountCurrency: 'IDR', currencyRates: new Map(),
    })).toBe(7)
  })
})
