import { z } from 'zod'

export const transactionFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z
    .number()
    .refine((v) => v !== 0, 'Amount must not be zero'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category_id: z.string().min(1, 'Category is required'),
  account_id: z.string().optional().nullable(),
  merchant: z.string().optional().nullable(),
  currency: z.string().length(3),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  is_recurring: z.boolean().optional(),
  recurring_frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().nullable(),
  recurring_end_date: z.string().optional().nullable(),
})

export const apiTransactionSchema = z.object({
  user_id: z.string().uuid({ message: "Invalid user_id" }),
  date: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  description: z.string().min(1, { message: "Description is required" }),
  amount: z.number(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  merchant: z.string().optional().nullable(),
  currency: z.string().length(3).optional().default('IDR'),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  is_recurring: z.boolean().optional(),
  recurring_frequency: z.string().optional(),
  recurring_end_date: z.string().optional()
})

export const reviewTransactionSchema = z.object({
  date: z.string().min(1, 'Date is required').refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category_id: z.string().min(1, 'Category is required'),
  merchant: z.string().optional().nullable(), // Allow null/undefined but validation will check string if present
  currency: z.string().length(3, 'Currency code must be 3 characters'),
})

// Export as transactionSchema for backward compatibility
export const transactionSchema = transactionFormSchema

export type TransactionFormData = z.infer<typeof transactionFormSchema>
export type ReviewTransactionData = z.infer<typeof reviewTransactionSchema>
