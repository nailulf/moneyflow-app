'use client'

import { TransactionProvider } from '@/contexts/TransactionContext'
import { BudgetProvider } from '@/contexts/BudgetContext'

export default function SpendingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!
  


  return (
    <BudgetProvider userId={TEST_USER_ID}>
      <TransactionProvider userId={TEST_USER_ID}>
        {children}
      </TransactionProvider>
    </BudgetProvider>
  )
}