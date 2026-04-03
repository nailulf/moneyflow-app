import {
  calculateAccountBalanceAtDate,
  calculateNetWorth,
  calculatePercentageChange,
  type BalanceTransaction,
} from '../../lib/net-worth-utils'

// Helper to build a minimal transaction
function tx(
  overrides: Partial<BalanceTransaction> & Pick<BalanceTransaction, 'amount' | 'type' | 'date'>
): BalanceTransaction {
  return {
    account_id: 'acct-A',
    to_account_id: null,
    ...overrides,
  }
}

const farFuture = new Date('2099-12-31')

describe('calculateAccountBalanceAtDate', () => {
  // ─── Basic INCOME / EXPENSE ─────────────────────────────────────────

  it('adds INCOME and subtracts EXPENSE from initial balance', () => {
    const transactions: BalanceTransaction[] = [
      tx({ amount: 500, type: 'INCOME', date: '2026-01-15' }),
      tx({ amount: 200, type: 'EXPENSE', date: '2026-01-20' }),
    ]
    // 1000 + 500 - 200 = 1300
    expect(calculateAccountBalanceAtDate(transactions, farFuture, 'BANK', 1000)).toBe(1300)
  })

  it('filters transactions after targetDate', () => {
    const transactions: BalanceTransaction[] = [
      tx({ amount: 500, type: 'INCOME', date: '2026-01-15' }),
      tx({ amount: 200, type: 'EXPENSE', date: '2026-03-01' }), // after target
    ]
    const target = new Date('2026-02-01')
    // 1000 + 500 = 1500  (expense excluded)
    expect(calculateAccountBalanceAtDate(transactions, target, 'BANK', 1000)).toBe(1500)
  })

  // ─── TRANSFER with to_account_id ────────────────────────────────────

  it('subtracts transfer from source account', () => {
    const transactions: BalanceTransaction[] = [
      tx({ amount: 300, type: 'TRANSFER', date: '2026-01-10', account_id: 'acct-A', to_account_id: 'acct-B' }),
    ]
    // 1000 - 300 = 700  (money left acct-A)
    expect(calculateAccountBalanceAtDate(transactions, farFuture, 'BANK', 1000, 'acct-A')).toBe(700)
  })

  it('adds transfer to destination account', () => {
    const transactions: BalanceTransaction[] = [
      tx({ amount: 300, type: 'TRANSFER', date: '2026-01-10', account_id: 'acct-A', to_account_id: 'acct-B' }),
    ]
    // 500 + 300 = 800  (money arrived at acct-B)
    expect(calculateAccountBalanceAtDate(transactions, farFuture, 'BANK', 500, 'acct-B')).toBe(800)
  })

  it('ignores transfer for unrelated account', () => {
    const transactions: BalanceTransaction[] = [
      tx({ amount: 300, type: 'TRANSFER', date: '2026-01-10', account_id: 'acct-A', to_account_id: 'acct-B' }),
    ]
    // acct-C is neither source nor destination
    expect(calculateAccountBalanceAtDate(transactions, farFuture, 'BANK', 1000, 'acct-C')).toBe(1000)
  })

  // ─── Legacy TRANSFER without to_account_id ──────────────────────────

  it('skips legacy transfer (no to_account_id) gracefully', () => {
    const transactions: BalanceTransaction[] = [
      tx({ amount: 300, type: 'TRANSFER', date: '2026-01-10', account_id: 'acct-A', to_account_id: null }),
    ]
    // No change — legacy transfer skipped
    expect(calculateAccountBalanceAtDate(transactions, farFuture, 'BANK', 1000, 'acct-A')).toBe(1000)
  })

  it('skips transfer when accountId param not provided', () => {
    const transactions: BalanceTransaction[] = [
      tx({ amount: 300, type: 'TRANSFER', date: '2026-01-10', account_id: 'acct-A', to_account_id: 'acct-B' }),
    ]
    // No accountId passed — can't determine direction, skip
    expect(calculateAccountBalanceAtDate(transactions, farFuture, 'BANK', 1000)).toBe(1000)
  })

  // ─── Mixed transactions ─────────────────────────────────────────────

  it('handles mixed income, expense, and transfers correctly', () => {
    const transactions: BalanceTransaction[] = [
      tx({ amount: 1000, type: 'INCOME', date: '2026-01-05', account_id: 'acct-A' }),
      tx({ amount: 200,  type: 'EXPENSE', date: '2026-01-10', account_id: 'acct-A' }),
      tx({ amount: 500,  type: 'TRANSFER', date: '2026-01-15', account_id: 'acct-A', to_account_id: 'acct-B' }),
      tx({ amount: 100,  type: 'TRANSFER', date: '2026-01-20', account_id: 'acct-B', to_account_id: 'acct-A' }),
    ]
    // acct-A: 0 + 1000 - 200 - 500 + 100 = 400
    expect(calculateAccountBalanceAtDate(transactions, farFuture, 'BANK', 0, 'acct-A')).toBe(400)
  })

  it('net worth is preserved across a transfer (zero-sum)', () => {
    const transfer: BalanceTransaction[] = [
      tx({ amount: 500, type: 'TRANSFER', date: '2026-01-10', account_id: 'acct-A', to_account_id: 'acct-B' }),
    ]
    const balA = calculateAccountBalanceAtDate(transfer, farFuture, 'BANK', 1000, 'acct-A') // 500
    const balB = calculateAccountBalanceAtDate(transfer, farFuture, 'BANK', 1000, 'acct-B') // 1500
    // Total should equal starting total (1000 + 1000 = 2000)
    expect(balA + balB).toBe(2000)
  })
})

describe('calculatePercentageChange', () => {
  it('returns 100 when old value is 0 and new is positive', () => {
    expect(calculatePercentageChange(0, 500)).toBe(100)
  })

  it('returns 0 when both values are 0', () => {
    expect(calculatePercentageChange(0, 0)).toBe(0)
  })

  it('calculates correct percentage', () => {
    expect(calculatePercentageChange(100, 150)).toBe(50)
    expect(calculatePercentageChange(200, 100)).toBe(-50)
  })
})
