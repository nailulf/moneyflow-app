'use client'

import { BudgetProvider } from '@/contexts/BudgetContext'

export default function SpendingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BudgetProvider>
      {children}
    </BudgetProvider>
  )
}
