import { reviewTransactionSchema } from '@/lib/validations'

describe('reviewTransactionSchema', () => {
  const validTransaction = {
    date: '2023-10-01',
    description: 'Grocery Store',
    amount: 50.00,
    type: 'EXPENSE',
    category_id: 'cat_123',
    merchant: 'Target',
    currency: 'USD'
  }

  it('validates a correct transaction', () => {
    const result = reviewTransactionSchema.safeParse(validTransaction)
    expect(result.success).toBe(true)
  })

  it('fails if date is invalid', () => {
    const invalid = { ...validTransaction, date: 'invalid-date' }
    const result = reviewTransactionSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid date format')
    }
  })

  it('fails if currency is not 3 chars', () => {
    const invalid = { ...validTransaction, currency: 'US' }
    const result = reviewTransactionSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Currency code must be 3 characters')
    }
  })

  it('fails if category_id is missing', () => {
    const invalid = { ...validTransaction, category_id: '' }
    const result = reviewTransactionSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('allows optional merchant', () => {
    const noMerchant = { ...validTransaction, merchant: undefined }
    const result = reviewTransactionSchema.safeParse(noMerchant)
    expect(result.success).toBe(true)
  })
})
