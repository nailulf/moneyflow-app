'use client'

import { BudgetProvider } from '@/contexts/BudgetContext'

export default function ChartsLayout({
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