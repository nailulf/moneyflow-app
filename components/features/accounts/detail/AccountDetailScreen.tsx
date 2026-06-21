'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Wallet,
  Smartphone,
  SlidersHorizontal,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useCategories } from '@/contexts/CategoryContext'
import { useAllTransactions } from '@/hooks/useTransactionsQuery'
import { queryKeys } from '@/hooks/useDataRefresh'
import { groupByDate } from '@/lib/transaction-filters'
import { buildBalanceHistory } from '@/lib/account-detail-utils'
import { StickyScreenHeader } from '@/components/features/navigation/StickyScreenHeader'
import { TransactionGroupedList } from '@/components/features/transaction/TransactionGroupedList'
import { AccountBalanceHero } from './AccountBalanceHero'
import { BalanceTrendCard } from './BalanceTrendCard'
import { AccountActionsMenu } from './AccountActionsMenu'
import { AdjustBalanceSheet } from './AdjustBalanceSheet'
import { EditAccountSheet } from './EditAccountSheet'
import { DeleteAccountDialog } from './DeleteAccountDialog'

const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  BANK: Building2,
  CREDIT_CARD: CreditCard,
  CASH: Wallet,
  DIGITAL_WALLET: Smartphone,
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AccountDetailScreen({ accountId }: { accountId: string }) {
  const t = useTranslations('accountDetail')
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { accounts, loading } = useAccounts()
  const { getCategoryName } = useCategories()
  const { transactions, isLoading } = useAllTransactions({ userId: user?.id ?? '', accountId })

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const account = accounts.find((a) => a.id === accountId)

  const series = useMemo(
    () =>
      account
        ? buildBalanceHistory({
            initialBalance: account.balance,
            currentBalance: account.currentBalance ?? account.balance,
            createdAt: account.created_at,
            accountId,
            transactions,
          })
        : [],
    [account, accountId, transactions]
  )

  const groups = useMemo(() => groupByDate(transactions), [transactions])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts(user?.id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.netWorth(user?.id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions(user?.id) })
    queryClient.invalidateQueries({ queryKey: ['balance-adjustments', accountId] })
  }

  const handleExport = () => {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Type']
    const csvContent = [
      headers.join(','),
      ...transactions.map((tx) =>
        [tx.date, `"${tx.description.replace(/"/g, '""')}"`, tx.amount, tx.category_id, tx.type].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `account-${accountId}-transactions.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success(t('actions.export'))
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!account) {
    router.push('/accounts')
    return null
  }

  const Icon = ACCOUNT_ICONS[account.type] ?? CreditCard
  const currentBalance = account.currentBalance ?? account.balance
  const typeLabel = account.type.toLowerCase().replace('_', ' ')

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pt-3 md:max-w-2xl">
      <StickyScreenHeader>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={t('header.back')}
            onClick={() => router.push('/accounts')}
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-card text-foreground shadow-card transition-colors hover:bg-muted/50"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl leading-title-4 font-bold text-foreground">{account.name}</h1>
            <p className="truncate text-xs leading-caption capitalize text-muted-foreground">{typeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdjustOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-[10px] bg-card px-3 text-sm font-medium text-foreground shadow-card transition-colors hover:bg-muted/50"
          >
            <SlidersHorizontal className="size-4" />
            {t('actions.adjust')}
          </button>
          <AccountActionsMenu
            onEdit={() => setEditOpen(true)}
            onExport={handleExport}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </StickyScreenHeader>

      <AccountBalanceHero icon={Icon} balance={currentBalance} currency={account.currency} />

      <BalanceTrendCard series={series} currency={account.currency} />

      <section className="flex flex-col gap-3">
        <h2 className="px-2 text-lg leading-title-5 font-semibold text-foreground">{t('tabs.transactions')}</h2>
        <TransactionGroupedList
          groups={groups}
          todayKey={todayKey()}
          getCategoryName={(id) => (id ? getCategoryName(id) : '')}
          getAccountName={() => account.name}
          onSelect={(tx) => router.push(`/transactions/${tx.id}/edit`)}
          isLoading={isLoading}
          hideAccount
        />
      </section>

      <AdjustBalanceSheet
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        accountId={accountId}
        currentBalance={currentBalance}
        currency={account.currency}
        onSaved={refresh}
      />
      <EditAccountSheet open={editOpen} onOpenChange={setEditOpen} account={account} />
      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        accountId={accountId}
        onDeleted={() => {
          refresh()
          router.push('/accounts')
        }}
      />
    </div>
  )
}
