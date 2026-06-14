import { amountReducer, fieldsForType, type AmountState } from '@/lib/transaction-form'

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
