'use client'

import { AccountProvider } from '@/contexts/AccountContext'

export default function AccountsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <AccountProvider>
      {children}
    </AccountProvider>
  )
}
