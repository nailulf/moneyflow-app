'use client'

import { BudgetProvider } from '@/contexts/BudgetContext'

export default function ChartsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!

  return (
    <BudgetProvider userId={TEST_USER_ID}>
      {children}
    </BudgetProvider>
  )
}