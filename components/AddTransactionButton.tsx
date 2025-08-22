'use client'

import { AddTransactionForm } from '@/components/AddTransactionForm'
import { TransactionFormData } from '@/lib/validations'

interface AddTransactionButtonProps {
  userId: string
  onTransactionAdded?: (transaction: TransactionFormData) => void
  className?: string
}

/**
 * A reusable component that wraps AddTransactionForm for consistent usage across pages.
 * This component provides a standardized way to add transactions with proper styling.
 */
export function AddTransactionButton({
  userId,
  onTransactionAdded
}: AddTransactionButtonProps) {
  return (
    <AddTransactionForm 
      userId={userId}
      onTransactionAdded={onTransactionAdded}
    />
  )
}