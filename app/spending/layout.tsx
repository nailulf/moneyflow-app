'use client'

import { TransactionProvider } from '@/contexts/TransactionContext'
import { BudgetProvider } from '@/contexts/BudgetContext'

export default function SpendingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BudgetProvider>
      <TransactionProvider>
        {children}
      </TransactionProvider>
    </BudgetProvider>
  )
}