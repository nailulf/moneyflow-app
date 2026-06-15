'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { TransactionForm } from '@/components/features/transaction/form/TransactionForm'

/** Full-screen Add Transaction route (design: Add-Transaction flow). */
export default function NewTransactionPage() {
  const router = useRouter()
  const { user } = useAuth()

  // Wait until auth context resolves — mirrors the pattern in /accounts/new/bank
  if (!user) return null

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-0 pt-3 pb-10 md:pt-8">
      <TransactionForm
        mode="create"
        userId={user.id}
        onDone={() => router.push('/transactions')}
      />
    </div>
  )
}
