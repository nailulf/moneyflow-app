import { amountReducer, fieldsForType, reconcileOnTypeChange, type AmountState, type FormState } from '@/lib/transaction-form'

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
