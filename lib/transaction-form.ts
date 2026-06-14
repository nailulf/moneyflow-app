// lib/transaction-form.ts
export type TxnType = 'INCOME' | 'EXPENSE' | 'TRANSFER'
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface FieldVisibility {
  category: boolean
  account: boolean
  toAccount: boolean
  requiredCategory: boolean
}

export function fieldsForType(type: TxnType): FieldVisibility {
  if (type === 'TRANSFER') return { category: false, account: true, toAccount: true, requiredCategory: false }
  return { category: true, account: true, toAccount: false, requiredCategory: true }
}

const MAX_DIGITS = 15
export interface AmountState { digits: string }
export type AmountAction =
  | { type: 'appendDigit'; digit: string }
  | { type: 'appendThousands' }
  | { type: 'backspace' }
  | { type: 'clear' }

export function amountReducer(state: AmountState, action: AmountAction): AmountState {
  switch (action.type) {
    case 'appendDigit': {
      if (state.digits === '' && action.digit === '0') return state // no leading zero
      if (state.digits.length >= MAX_DIGITS) return state
      return { digits: state.digits + action.digit }
    }
    case 'appendThousands': {
      if (state.digits === '') return state
      if (state.digits.length + 3 > MAX_DIGITS) return state
      return { digits: state.digits + '000' }
    }
    case 'backspace':
      return { digits: state.digits.slice(0, -1) }
    case 'clear':
      return { digits: '' }
    default:
      return state
  }
}

/** Numeric amount from digit string (integer currency units, e.g. IDR has no decimals here). */
export function amountValue(state: AmountState): number {
  return state.digits === '' ? 0 : Number(state.digits)
}

/** Grouped display, e.g. "125000" -> "125,000". Empty -> "0". */
export function formatAmountDisplay(state: AmountState): string {
  return amountValue(state).toLocaleString('en-US')
}

export interface FormState {
  type: TxnType
  amount: AmountState
  categoryId: string | null
  accountId: string | null
  toAccountId: string | null
  note: string
  date: string // YYYY-MM-DD
  currency: string
  isRecurring: boolean
  recurringFrequency: RecurringFrequency | null
  recurringEndDate: string | null
}

/** Switch type, resetting ONLY fields invalidated by the new type. Keeps amount + note + date. */
export function reconcileOnTypeChange(prev: FormState, nextType: TxnType): FormState {
  if (nextType === prev.type) return prev
  if (nextType === 'TRANSFER') {
    return { ...prev, type: nextType, categoryId: null, toAccountId: null }
  }
  // -> EXPENSE or INCOME: category is type-specific so always clear; drop transfer dest.
  return { ...prev, type: nextType, categoryId: null, toAccountId: null }
}

export function isFormValid(s: FormState): boolean {
  if (amountValue(s.amount) <= 0) return false
  if (!s.accountId) return false
  if (s.type === 'TRANSFER') return !!s.toAccountId && s.toAccountId !== s.accountId
  return !!s.categoryId
}

export interface TransactionPayload {
  user_id: string
  date: string
  description: string
  amount: number
  type: TxnType
  category_id: string | null
  account_id: string | null
  to_account_id: string | null
  currency: string
  notes: string | null
  is_recurring: boolean
  recurring_frequency: string | null
  recurring_end_date: string | null
}

export function buildTransactionPayload(s: FormState, _mode: 'create' | 'edit', userId: string): TransactionPayload {
  return {
    user_id: userId,
    date: new Date(s.date).toISOString(),
    description: s.note || defaultDescription(s),
    amount: amountValue(s.amount),
    type: s.type,
    category_id: s.type === 'TRANSFER' ? null : s.categoryId,
    account_id: s.accountId,
    to_account_id: s.type === 'TRANSFER' ? s.toAccountId : null,
    currency: s.currency,
    notes: s.note || null,
    is_recurring: s.isRecurring,
    recurring_frequency: s.isRecurring ? s.recurringFrequency : null,
    recurring_end_date: s.isRecurring ? s.recurringEndDate : null,
  }
}

function defaultDescription(s: FormState): string {
  if (s.type === 'TRANSFER') return 'Transfer'
  return s.type === 'INCOME' ? 'Income' : 'Expense'
}
