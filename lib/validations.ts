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
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  is_recurring: z.boolean().optional(),
  recurring_frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().nullable(),
  recurring_end_date: z.string().optional().nullable(),
})

// Export as transactionSchema for backward compatibility
export const transactionSchema = transactionFormSchema

export type TransactionFormData = z.infer<typeof transactionFormSchema>
