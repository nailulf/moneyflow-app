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
