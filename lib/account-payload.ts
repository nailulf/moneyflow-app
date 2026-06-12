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

/** Validates and normalizes an account create payload. Pure — unit-tested. */
export function sanitizeAccountPayload(body: Record<string, unknown>): AccountPayloadResult {
  try {
    const name = str(body.name)
    if (!name) return { ok: false, error: 'Name is required' }

    const type = oneOf(body.type ?? 'BANK', ACCOUNT_TYPES, 'type')
    if (!type) return { ok: false, error: 'type is required' }

    const balanceRaw = body.balance === undefined || body.balance === null || body.balance === '' ? 0 : Number(body.balance)
    if (!Number.isFinite(balanceRaw)) return { ok: false, error: 'balance must be a number' }

    const loanTerm = (() => {
      if (body.loan_term_months === undefined || body.loan_term_months === null || body.loan_term_months === '') return null
      const n = Number(body.loan_term_months)
      if (!Number.isInteger(n) || n <= 0) throw new Error('loan_term_months must be a positive integer')
      return n
    })()

    return {
      ok: true,
      data: {
        name,
        type,
        balance: balanceRaw,
        currency: str(body.currency) ?? 'IDR',
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
