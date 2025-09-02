import { z } from 'zod'

export const transactionFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z
    .number()
    .refine((v) => v !== 0, 'Amount must not be zero'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category_id: z.string().min(1, 'Category is required'),
  merchant: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  is_recurring: z.boolean().default(false),
})

// Export as transactionSchema for backward compatibility
export const transactionSchema = transactionFormSchema



export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['application/pdf', 'text/csv', 'application/vnd.ms-excel'].includes(file.type),
      'File must be PDF or CSV'
    )
})

export type TransactionFormData = z.infer<typeof transactionFormSchema>
export type FileUploadFormData = z.infer<typeof fileUploadSchema>