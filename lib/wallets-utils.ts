export interface WalletAccountLike {
  id: string
  name: string
  type: string
  balance: number
  currentBalance?: number
  currentBalanceInBase?: number
  currency: string
}

export type WalletGroupKey = 'bank' | 'digitalWallets' | 'assets' | 'cashOther' | 'loans'

export interface WalletGroup<A extends WalletAccountLike> {
  key: WalletGroupKey
  accounts: A[]
}

export const effectiveBalance = (a: WalletAccountLike): number =>
  a.currentBalanceInBase ?? a.currentBalance ?? a.balance

const LOAN_TYPES = new Set(['CREDIT_CARD', 'MORTGAGE'])

const TYPE_TO_GROUP: Record<string, WalletGroupKey> = {
  BANK: 'bank',
  DIGITAL_WALLET: 'digitalWallets',
  PROPERTY: 'assets',
  VEHICLE: 'assets',
  INVESTMENT: 'assets',
  CASH: 'cashOther',
  OTHER: 'cashOther',
}

const GROUP_ORDER: WalletGroupKey[] = ['bank', 'digitalWallets', 'assets', 'cashOther', 'loans']

/** Design-ordered, non-empty wallet groups; loans absorb liability types and negative balances. */
export function groupAccounts<A extends WalletAccountLike>(accounts: A[]): WalletGroup<A>[] {
  const buckets = new Map<WalletGroupKey, A[]>(GROUP_ORDER.map((k) => [k, []]))
  for (const account of accounts) {
    const key: WalletGroupKey =
      LOAN_TYPES.has(account.type) || effectiveBalance(account) < 0
        ? 'loans'
        : TYPE_TO_GROUP[account.type] ?? 'cashOther'
    buckets.get(key)!.push(account)
  }
  return GROUP_ORDER
    .map((key) => ({ key, accounts: buckets.get(key)! }))
    .filter((g) => g.accounts.length > 0)
}
