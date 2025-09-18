'use client'

import { CategoryProvider } from '@/contexts/CategoryContext'
import { TransactionProvider } from '@/contexts/TransactionContext'

export default function SpendingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!
  
  console.log('🏗️ SpendingLayout rendering with TEST_USER_ID:', TEST_USER_ID)

  return (
    <CategoryProvider userId={TEST_USER_ID}>
      <TransactionProvider userId={TEST_USER_ID}>
        {children}
      </TransactionProvider>
    </CategoryProvider>
  )
}