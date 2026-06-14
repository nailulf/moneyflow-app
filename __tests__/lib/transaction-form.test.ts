import { amountReducer, fieldsForType, reconcileOnTypeChange, buildTransactionPayload, isFormValid, type AmountState, type FormState } from '@/lib/transaction-form'

describe('fieldsForType', () => {
  it('expense/income show category + single account, not transfer', () => {
    expect(fieldsForType('EXPENSE')).toEqual({ category: true, account: true, toAccount: false, requiredCategory: true })
    expect(fieldsForType('INCOME')).toEqual({ category: true, account: true, toAccount: false, requiredCategory: true })
  })
  it('transfer shows from+to, hides category', () => {
    expect(fieldsForType('TRANSFER')).toEqual({ category: false, account: true, toAccount: true, requiredCategory: false })
  })
})

describe('amountReducer (integer minor units)', () => {
  const zero: AmountState = { digits: '' }
  it('appends digits', () => {
    let s = amountReducer(zero, { type: 'appendDigit', digit: '1' })
    s = amountReducer(s, { type: 'appendDigit', digit: '2' })
    s = amountReducer(s, { type: 'appendDigit', digit: '5' })
    expect(s.digits).toBe('125')
  })
  it('appends 000 thousands', () => {
    const s = amountReducer({ digits: '125' }, { type: 'appendThousands' })
    expect(s.digits).toBe('125000')
  })
  it('ignores leading zeros', () => {
    const s = amountReducer(zero, { type: 'appendDigit', digit: '0' })
    expect(s.digits).toBe('')
  })
  it('backspaces and clears', () => {
    expect(amountReducer({ digits: '125' }, { type: 'backspace' }).digits).toBe('12')
    expect(amountReducer({ digits: '125' }, { type: 'clear' }).digits).toBe('')
  })
  it('caps length to avoid overflow', () => {
    const long = '1'.repeat(15)
    expect(amountReducer({ digits: long }, { type: 'appendDigit', digit: '2' }).digits).toBe(long)
  })
})

function base(over: Partial<FormState> = {}): FormState {
  return {
    type: 'EXPENSE', amount: { digits: '125' }, categoryId: 'food',
    accountId: 'A', toAccountId: null, note: 'lunch', date: '2026-06-14',
    currency: 'IDR', isRecurring: false, recurringFrequency: null, recurringEndDate: null, ...over,
  }
}

describe('reconcileOnTypeChange', () => {
  it('expense -> income clears category, keeps amount + note', () => {
    const s = reconcileOnTypeChange(base(), 'INCOME')
    expect(s.type).toBe('INCOME')
    expect(s.categoryId).toBeNull()
    expect(s.amount.digits).toBe('125')
    expect(s.note).toBe('lunch')
    expect(s.toAccountId).toBeNull()
  })
  it('expense -> transfer clears category, keeps account as source, requires to', () => {
    const s = reconcileOnTypeChange(base(), 'TRANSFER')
    expect(s.type).toBe('TRANSFER')
    expect(s.categoryId).toBeNull()
    expect(s.accountId).toBe('A')
    expect(s.toAccountId).toBeNull()
  })
  it('transfer -> expense clears toAccount, clears category (re-pick), keeps account', () => {
    const s = reconcileOnTypeChange(base({ type: 'TRANSFER', categoryId: null, toAccountId: 'B' }), 'EXPENSE')
    expect(s.type).toBe('EXPENSE')
    expect(s.toAccountId).toBeNull()
    expect(s.categoryId).toBeNull()
    expect(s.accountId).toBe('A')
  })
  it('same type is a no-op (returns prev)', () => {
    const b = base()
    expect(reconcileOnTypeChange(b, 'EXPENSE')).toBe(b)
  })
})

describe('isFormValid', () => {
  it('expense needs amount>0, category, account', () => {
    expect(isFormValid(base({ amount: { digits: '' } }))).toBe(false)
    expect(isFormValid(base({ categoryId: null }))).toBe(false)
    expect(isFormValid(base({ accountId: null }))).toBe(false)
    expect(isFormValid(base())).toBe(true)
  })
  it('transfer needs distinct to-account, no category', () => {
    const t = base({ type: 'TRANSFER', categoryId: null, accountId: 'A', toAccountId: 'A' })
    expect(isFormValid(t)).toBe(false)
    expect(isFormValid({ ...t, toAccountId: 'B' })).toBe(true)
  })
})

describe('buildTransactionPayload', () => {
  it('create expense maps fields, type carries sign (amount positive)', () => {
    const p = buildTransactionPayload(base(), 'create', 'user-1')
    expect(p).toMatchObject({
      user_id: 'user-1', type: 'EXPENSE', amount: 125, category_id: 'food',
      account_id: 'A', to_account_id: null, currency: 'IDR', is_recurring: false,
    })
    expect(p.date).toMatch(/^2026-06-14/)
  })
  it('transfer payload sets to_account_id and null category', () => {
    const p = buildTransactionPayload(base({ type: 'TRANSFER', categoryId: null, toAccountId: 'B' }), 'create', 'user-1')
    expect(p).toMatchObject({ type: 'TRANSFER', to_account_id: 'B', category_id: null })
  })
  it('recurring carries frequency + end date', () => {
    const p = buildTransactionPayload(base({ isRecurring: true, recurringFrequency: 'monthly', recurringEndDate: '2027-01-01' }), 'create', 'u')
    expect(p).toMatchObject({ is_recurring: true, recurring_frequency: 'monthly', recurring_end_date: '2027-01-01' })
  })
  it('empty note falls back to a type label for the required description', () => {
    const p = buildTransactionPayload(base({ note: '' }), 'create', 'u')
    expect(p.description).toBe('Expense')
    expect(p.notes).toBeNull()
  })
})
