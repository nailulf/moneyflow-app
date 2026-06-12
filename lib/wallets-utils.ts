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

import type { AccountDB } from '@/types/database'

type AccountInsert = Omit<AccountDB, 'id' | 'created_at' | 'updated_at'>

/** Full createAccount payload: every nullable column explicit, sane defaults. */
export function buildAccountPayload(
  userId: string,
  fields: { name: string; type: AccountDB['type'] } & Partial<Omit<AccountInsert, 'user_id' | 'name' | 'type'>>
): AccountInsert {
  return {
    user_id: userId,
    name: fields.name,
    type: fields.type,
    balance: fields.balance ?? 0,
    currency: fields.currency ?? 'IDR',
    is_default: fields.is_default ?? false,
    is_active: fields.is_active ?? true,
    description: fields.description ?? null,
    property_type: fields.property_type ?? null,
    asset_location: fields.asset_location ?? null,
    depreciation_rate: fields.depreciation_rate ?? null,
    monthly_payment: fields.monthly_payment ?? null,
    mortgage_end_date: fields.mortgage_end_date ?? null,
    purchase_date: fields.purchase_date ?? null,
    credit_limit: fields.credit_limit ?? null,
    statement_day: fields.statement_day ?? null,
    due_day: fields.due_day ?? null,
    vehicle_type: fields.vehicle_type ?? null,
    broker: fields.broker ?? null,
    interest_rate: fields.interest_rate ?? null,
    loan_term_months: fields.loan_term_months ?? null,
    down_payment: fields.down_payment ?? null,
    investment_goal: fields.investment_goal ?? null,
  }
}

export interface MortgageInput {
  propertyName: string
  currentValue: number
  downPayment: number
  interestRate: number
  monthlyPayment: number
  loanTermYears: number
  purchaseDate: string // YYYY-MM-DD
}

export interface DerivedMortgage {
  name: string
  balance: number
  monthly_payment: number
  interest_rate: number
  loan_term_months: number
  mortgage_end_date: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Linked MORTGAGE liability derived from the property form (spec § 3.2). */
export function deriveMortgage(input: MortgageInput): DerivedMortgage {
  const [y, m, d] = input.purchaseDate.split('-').map(Number)
  const endYear = y + input.loanTermYears
  const daysInEndMonth = new Date(endYear, m, 0).getDate()
  const endDay = Math.min(d, daysInEndMonth)
  return {
    name: `${input.propertyName} — Mortgage`,
    balance: -(input.currentValue - input.downPayment),
    monthly_payment: input.monthlyPayment,
    interest_rate: input.interestRate,
    loan_term_months: input.loanTermYears * 12,
    mortgage_end_date: `${endYear}-${pad(m)}-${pad(endDay)}`,
  }
}
