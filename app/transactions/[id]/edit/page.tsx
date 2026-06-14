'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useAllTransactions } from '@/hooks/useTransactionsQuery'
import { TransactionForm } from '@/components/features/transaction/form/TransactionForm'

/** Full-screen Edit Transaction route — mirrors /transactions/new (D2). */
export default function EditTransactionPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  const { user } = useAuth()
  const { transactions, totalCount, isLoading } = useAllTransactions({ userId: user?.id ?? '' })

  const txn = transactions.find((t) => t.id === id)

  // Redirect away only once ALL pages are loaded (transactions.length >= totalCount)
  // and the id still isn't found — covers the empty-account case without redirecting
  // prematurely while background pagination is still streaming pages in.
  const fullyLoaded = !isLoading && transactions.length >= totalCount
  useEffect(() => {
    if (fullyLoaded && !txn) {
      router.replace('/transactions')
    }
  }, [fullyLoaded, txn, router])

  // Wait until auth resolves — mirrors /transactions/new
  if (!user) return null

  // Still fetching — show nothing (avoids flash of wrong content)
  if (isLoading || !txn) return null

  const initial = {
    id: txn.id,
    type: txn.type,
    amount: { digits: String(Math.round(Math.abs(txn.amount))) },
    categoryId: txn.category_id ?? null,
    accountId: txn.account_id ?? null,
    toAccountId: txn.to_account_id ?? null,
    note: txn.notes ?? '',
    date: (txn.date || '').slice(0, 10), // YYYY-MM-DD
    currency: txn.currency || 'IDR',
    isRecurring: !!txn.is_recurring,
    recurringFrequency: txn.recurring_frequency ?? null,
    recurringEndDate: txn.recurring_end_date ?? null,
    isBalanceAdjustment: !!txn.is_balance_adjustment,
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-0 pt-3 pb-10 md:pt-8">
      <TransactionForm
        mode="edit"
        userId={user.id}
        initial={initial}
        onDone={() => router.push('/transactions')}
      />
    </div>
  )
}
