'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { AccountDetailScreen } from '@/components/features/accounts/detail/AccountDetailScreen'
import { AccountDetailView } from '@/components/AccountDetailView'

const TRANSACTIONAL = new Set(['BANK', 'CREDIT_CARD', 'CASH', 'DIGITAL_WALLET', 'OTHER'])

export default function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const router = useRouter()
  const { accounts, loading } = useAccounts()
  const account = accounts.find((a) => a.id === accountId)

  useEffect(() => {
    if (!loading && account?.type === 'INVESTMENT') {
      router.replace(`/portfolio/${accountId}`)
    }
  }, [loading, account?.type, accountId, router])

  if (loading || (account && account.type === 'INVESTMENT')) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (account && !TRANSACTIONAL.has(account.type)) {
    return <AccountDetailView accountId={accountId} />
  }

  return <AccountDetailScreen accountId={accountId} />
}
