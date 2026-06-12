import { z } from 'zod'

// Error messages are i18n SUB-KEYS under `accountCreate.errors.*` —
// forms render them via t(`errors.${message}`). Never put English here.

const requiredName = z.string().trim().min(1, { message: 'nameRequired' })

/** '' → 0; '1000'/'1.5' → number; rejects non-numeric or negative. */
const money = (opts?: { positive?: boolean }) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? 0 : Number(v)),
    opts?.positive
      ? z.number({ message: 'amountInvalid' }).positive({ message: 'amountInvalid' })
      : z.number({ message: 'amountInvalid' }).nonnegative({ message: 'amountInvalid' })
  )

const dayOfMonth = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
  z.number({ message: 'dayRange' }).int({ message: 'dayRange' }).min(1, { message: 'dayRange' }).max(31, { message: 'dayRange' })
)

export const bankAccountSchema = z.object({
  kind: z.enum(['BANK', 'DIGITAL_WALLET']),
  name: requiredName,
  balance: money(),
})
export type BankAccountForm = z.infer<typeof bankAccountSchema>

export const propertySchema = z
  .object({
    name: requiredName,
    currentValue: money({ positive: true }),
    purchaseDate: z.string().min(1, { message: 'dateRequired' }),
    hasMortgage: z.boolean(),
    downPayment: z.string().optional(),
    interestRate: z.string().optional(),
    monthlyPayment: z.string().optional(),
    loanTermYears: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.hasMortgage) return
    const fields = ['downPayment', 'interestRate', 'monthlyPayment', 'loanTermYears'] as const
    for (const f of fields) {
      const v = data[f]
      if (v === undefined || v.trim() === '' || Number.isNaN(Number(v))) {
        ctx.addIssue({ code: 'custom', message: 'mortgageIncomplete', path: [f] })
        return
      }
    }
    if (Number(data.loanTermYears) <= 0) {
      ctx.addIssue({ code: 'custom', message: 'termInvalid', path: ['loanTermYears'] })
    }
    if (Number(data.downPayment) >= Number(data.currentValue)) {
      ctx.addIssue({ code: 'custom', message: 'downPaymentTooLarge', path: ['downPayment'] })
    }
  })
  .transform((data) => ({
    name: data.name,
    currentValue: data.currentValue,
    purchaseDate: data.purchaseDate,
    hasMortgage: data.hasMortgage,
    downPayment: data.hasMortgage ? Number(data.downPayment) : undefined,
    interestRate: data.hasMortgage ? Number(data.interestRate) : undefined,
    monthlyPayment: data.hasMortgage ? Number(data.monthlyPayment) : undefined,
    loanTermYears: data.hasMortgage ? Number(data.loanTermYears) : undefined,
  }))
export type PropertyForm = z.infer<typeof propertySchema>

export const vehicleSchema = z.object({
  vehicleType: z.enum(['CAR', 'MOTORCYCLE', 'TRUCK']),
  name: requiredName,
  purchasePrice: money({ positive: true }),
  depreciationRate: money(),
})
export type VehicleForm = z.infer<typeof vehicleSchema>

export const creditCardSchema = z.object({
  name: requiredName,
  creditLimit: money(),
  statementDay: dayOfMonth,
  dueDay: dayOfMonth,
})
export type CreditCardForm = z.infer<typeof creditCardSchema>

export const investmentSchema = z.object({
  name: requiredName,
  broker: z.string().trim().min(1, { message: 'brokerRequired' }),
  goal: z.string().trim().optional().or(z.literal('')),
})
export type InvestmentForm = z.infer<typeof investmentSchema>
