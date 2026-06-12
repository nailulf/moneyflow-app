import { SUPPORTED_CURRENCIES } from '@/lib/exchange-rate'

const ACCOUNT_TYPES = [
  'BANK', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'OTHER',
  'PROPERTY', 'VEHICLE', 'MORTGAGE', 'DIGITAL_WALLET',
] as const
const VEHICLE_TYPES = ['CAR', 'MOTORCYCLE', 'TRUCK'] as const
const PROPERTY_TYPES = ['HOUSE', 'APARTMENT', 'LAND'] as const

export type AccountTypeValue = (typeof ACCOUNT_TYPES)[number]

export interface SanitizedAccountFields {
  name: string
  type: AccountTypeValue
  balance: number
  currency: string
  is_default: boolean
  description: string | null
  property_type: (typeof PROPERTY_TYPES)[number] | null
  asset_location: string | null
  depreciation_rate: number | null
  monthly_payment: number | null
  mortgage_end_date: string | null
  purchase_date: string | null
  credit_limit: number | null
  statement_day: number | null
  due_day: number | null
  vehicle_type: (typeof VEHICLE_TYPES)[number] | null
  broker: string | null
  interest_rate: number | null
  loan_term_months: number | null
  down_payment: number | null
  investment_goal: string | null
}

export type AccountPayloadResult =
  | { ok: true; data: SanitizedAccountFields }
  | { ok: false; error: string }

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null

const nonNegative = (v: unknown, field: string): number | null => {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field} must be a non-negative number`)
  return n
}

const dayOfMonth = (v: unknown, field: string): number | null => {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  if (!Number.isInteger(n) || n < 1 || n > 31) throw new Error(`${field} must be a day of month (1-31)`)
  return n
}

const oneOf = <T extends readonly string[]>(v: unknown, allowed: T, field: string): T[number] | null => {
  if (v === undefined || v === null || v === '') return null
  const s = String(v).toUpperCase()
  if (!(allowed as readonly string[]).includes(s)) throw new Error(`${field} must be one of ${allowed.join(', ')}`)
  return s as T[number]
}

const positiveInt = (v: unknown, field: string): number | null => {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${field} must be a positive integer`)
  return n
}

const finiteNumber = (v: unknown, field: string): number => {
  if (v === null || v === '') throw new Error(`${field} must be a number`)
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${field} must be a number`)
  return n
}

const strictBoolean = (v: unknown, field: string): boolean => {
  if (typeof v !== 'boolean') throw new Error(`${field} must be a boolean`)
  return v
}

/** Validates and normalizes an account create payload. Pure — unit-tested. */
export function sanitizeAccountPayload(body: Record<string, unknown>): AccountPayloadResult {
  try {
    const name = str(body.name)
    if (!name) return { ok: false, error: 'Name is required' }

    const type = oneOf(body.type ?? 'BANK', ACCOUNT_TYPES, 'type')
    if (!type) return { ok: false, error: 'type is required' }

    const balanceRaw = body.balance === undefined || body.balance === null || body.balance === '' ? 0 : Number(body.balance)
    if (!Number.isFinite(balanceRaw)) return { ok: false, error: 'balance must be a number' }

    const loanTerm = positiveInt(body.loan_term_months, 'loan_term_months')

    return {
      ok: true,
      data: {
        name,
        type,
        balance: balanceRaw,
        currency: oneOf(body.currency, SUPPORTED_CURRENCIES, 'currency') ?? 'IDR',
        is_default: body.is_default === true,
        description: str(body.description),
        property_type: oneOf(body.property_type, PROPERTY_TYPES, 'property_type'),
        asset_location: str(body.asset_location),
        depreciation_rate: nonNegative(body.depreciation_rate, 'depreciation_rate'),
        monthly_payment: nonNegative(body.monthly_payment, 'monthly_payment'),
        mortgage_end_date: str(body.mortgage_end_date),
        purchase_date: str(body.purchase_date),
        credit_limit: nonNegative(body.credit_limit, 'credit_limit'),
        statement_day: dayOfMonth(body.statement_day, 'statement_day'),
        due_day: dayOfMonth(body.due_day, 'due_day'),
        vehicle_type: oneOf(body.vehicle_type, VEHICLE_TYPES, 'vehicle_type'),
        broker: str(body.broker),
        interest_rate: nonNegative(body.interest_rate, 'interest_rate'),
        loan_term_months: loanTerm,
        down_payment: nonNegative(body.down_payment, 'down_payment'),
        investment_goal: str(body.investment_goal),
      },
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid payload' }
  }
}

export type SanitizedAccountUpdate = Partial<SanitizedAccountFields & { is_active: boolean }>

export type AccountUpdateResult =
  | { ok: true; data: SanitizedAccountUpdate }
  | { ok: false; error: string }

/**
 * Validates and normalizes an account update payload. Only keys present in the
 * body are validated and returned, so PUT keeps its only-update-provided-fields
 * semantics. Pure — unit-tested.
 */
export function sanitizeAccountUpdate(body: Record<string, unknown>): AccountUpdateResult {
  try {
    const data: SanitizedAccountUpdate = {}

    if (body.name !== undefined) {
      const name = str(body.name)
      if (!name) return { ok: false, error: 'name must be a non-empty string' }
      data.name = name
    }
    if (body.type !== undefined) {
      const type = oneOf(body.type, ACCOUNT_TYPES, 'type')
      if (!type) return { ok: false, error: `type must be one of ${ACCOUNT_TYPES.join(', ')}` }
      data.type = type
    }
    if (body.currency !== undefined) {
      const currency = oneOf(body.currency, SUPPORTED_CURRENCIES, 'currency')
      if (!currency) return { ok: false, error: `currency must be one of ${SUPPORTED_CURRENCIES.join(', ')}` }
      data.currency = currency
    }
    if (body.balance !== undefined) data.balance = finiteNumber(body.balance, 'balance')
    if (body.is_default !== undefined) data.is_default = strictBoolean(body.is_default, 'is_default')
    if (body.is_active !== undefined) data.is_active = strictBoolean(body.is_active, 'is_active')
    if (body.description !== undefined) data.description = str(body.description)
    if (body.property_type !== undefined) data.property_type = oneOf(body.property_type, PROPERTY_TYPES, 'property_type')
    if (body.asset_location !== undefined) data.asset_location = str(body.asset_location)
    if (body.depreciation_rate !== undefined) data.depreciation_rate = nonNegative(body.depreciation_rate, 'depreciation_rate')
    if (body.monthly_payment !== undefined) data.monthly_payment = nonNegative(body.monthly_payment, 'monthly_payment')
    if (body.mortgage_end_date !== undefined) data.mortgage_end_date = str(body.mortgage_end_date)
    if (body.purchase_date !== undefined) data.purchase_date = str(body.purchase_date)
    if (body.credit_limit !== undefined) data.credit_limit = nonNegative(body.credit_limit, 'credit_limit')
    if (body.statement_day !== undefined) data.statement_day = dayOfMonth(body.statement_day, 'statement_day')
    if (body.due_day !== undefined) data.due_day = dayOfMonth(body.due_day, 'due_day')
    if (body.vehicle_type !== undefined) data.vehicle_type = oneOf(body.vehicle_type, VEHICLE_TYPES, 'vehicle_type')
    if (body.broker !== undefined) data.broker = str(body.broker)
    if (body.interest_rate !== undefined) data.interest_rate = nonNegative(body.interest_rate, 'interest_rate')
    if (body.loan_term_months !== undefined) data.loan_term_months = positiveInt(body.loan_term_months, 'loan_term_months')
    if (body.down_payment !== undefined) data.down_payment = nonNegative(body.down_payment, 'down_payment')
    if (body.investment_goal !== undefined) data.investment_goal = str(body.investment_goal)

    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid payload' }
  }
}
