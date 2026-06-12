import {
  bankAccountSchema, propertySchema, vehicleSchema, creditCardSchema, investmentSchema,
} from '@/lib/validations-account'

describe('bankAccountSchema', () => {
  it('accepts a valid bank payload and coerces balance', () => {
    const r = bankAccountSchema.safeParse({ kind: 'BANK', name: 'BCA Savings', balance: '1000' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.balance).toBe(1000)
  })
  it('accepts DIGITAL_WALLET kind and defaults empty balance to 0', () => {
    const r = bankAccountSchema.safeParse({ kind: 'DIGITAL_WALLET', name: 'GoPay', balance: '' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.balance).toBe(0)
  })
  it('rejects missing name with the i18n key', () => {
    const r = bankAccountSchema.safeParse({ kind: 'BANK', name: '', balance: '0' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('nameRequired')
  })
})

describe('propertySchema', () => {
  const base = { name: 'House — Depok', currentValue: '850000000', purchaseDate: '2024-05-01', hasMortgage: false }
  it('accepts a property without mortgage', () => {
    expect(propertySchema.safeParse(base).success).toBe(true)
  })
  it('requires positive value and a purchase date', () => {
    expect(propertySchema.safeParse({ ...base, currentValue: '0' }).success).toBe(false)
    expect(propertySchema.safeParse({ ...base, purchaseDate: '' }).success).toBe(false)
  })
  it('with mortgage on, requires the four loan fields', () => {
    const r = propertySchema.safeParse({ ...base, hasMortgage: true })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain('mortgageIncomplete')
  })
  it('rejects down payment >= current value', () => {
    const r = propertySchema.safeParse({
      ...base, hasMortgage: true,
      downPayment: '900000000', interestRate: '7.5', monthlyPayment: '5000000', loanTermYears: '15',
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain('downPaymentTooLarge')
  })
  it('rejects fractional loan terms with the i18n key', () => {
    const r = propertySchema.safeParse({
      ...base, hasMortgage: true,
      downPayment: '250000000', interestRate: '7.5', monthlyPayment: '5000000', loanTermYears: '7.4',
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain('termInvalid')
  })
  it('rejects negative down payments with the i18n key', () => {
    const r = propertySchema.safeParse({
      ...base, hasMortgage: true,
      downPayment: '-1000000', interestRate: '7.5', monthlyPayment: '5000000', loanTermYears: '15',
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain('amountInvalid')
  })
  it('accepts a full mortgage block', () => {
    const r = propertySchema.safeParse({
      ...base, hasMortgage: true,
      downPayment: '250000000', interestRate: '7.5', monthlyPayment: '5000000', loanTermYears: '15',
    })
    expect(r.success).toBe(true)
    if (r.success && r.data.hasMortgage) expect(r.data.loanTermYears).toBe(15)
  })
})

describe('vehicleSchema', () => {
  it('accepts a valid vehicle with coerced depreciation', () => {
    const r = vehicleSchema.safeParse({ vehicleType: 'CAR', name: 'Honda HR-V', purchasePrice: '180000000', depreciationRate: '10' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.depreciationRate).toBe(10)
  })
  it('rejects unknown vehicle types and non-positive price', () => {
    expect(vehicleSchema.safeParse({ vehicleType: 'BOAT', name: 'X', purchasePrice: '1', depreciationRate: '10' }).success).toBe(false)
    expect(vehicleSchema.safeParse({ vehicleType: 'CAR', name: 'X', purchasePrice: '0', depreciationRate: '10' }).success).toBe(false)
  })
})

describe('creditCardSchema', () => {
  const base = { name: 'BCA Platinum', creditLimit: '50000000', statementDay: '25', dueDay: '15' }
  it('accepts a valid card and coerces days to integers', () => {
    const r = creditCardSchema.safeParse(base)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.statementDay).toBe(25)
  })
  it('rejects out-of-range days with the i18n key', () => {
    const r = creditCardSchema.safeParse({ ...base, dueDay: '32' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('dayRange')
    expect(creditCardSchema.safeParse({ ...base, statementDay: '0' }).success).toBe(false)
  })
})

describe('investmentSchema', () => {
  it('accepts name + broker with optional goal', () => {
    expect(investmentSchema.safeParse({ name: 'Stockbit — Growth', broker: 'Stockbit', goal: '' }).success).toBe(true)
    expect(investmentSchema.safeParse({ name: 'Bibit', broker: 'Bibit', goal: 'Capital Gain' }).success).toBe(true)
  })
  it('requires name and broker', () => {
    expect(investmentSchema.safeParse({ name: '', broker: 'X', goal: '' }).success).toBe(false)
    expect(investmentSchema.safeParse({ name: 'X', broker: '', goal: '' }).success).toBe(false)
  })
})
