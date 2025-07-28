import { z } from 'zod'
import { CATEGORIES } from '@/types/app'

export const transactionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  category: z.enum(CATEGORIES),
  merchant: z.string().optional()
})

export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['application/pdf', 'text/csv', 'application/vnd.ms-excel'].includes(file.type),
      'File must be PDF or CSV'
    )
})

export type TransactionFormData = z.infer<typeof transactionSchema>
export type FileUploadFormData = z.infer<typeof fileUploadSchema>