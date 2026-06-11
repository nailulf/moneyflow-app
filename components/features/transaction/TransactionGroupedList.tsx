'use client'

import { useLocale, useTranslations } from 'next-intl'
import type { Transaction } from '@/types/database'
import { type TransactionGroup, relativeDayLabel } from '@/lib/transaction-filters'
import { TransactionRow } from './TransactionRow'

interface Props {
  groups: TransactionGroup[]
  todayKey: string
  getCategoryName: (id: string | null) => string
  getCategoryColor: (id: string | null) => string
  getAccountName: (id: string | null) => string
  onSelect: (t: Transaction) => void
  isLoading: boolean
}

export function TransactionGroupedList({ groups, todayKey, getCategoryName, getCategoryColor, getAccountName, onSelect, isLoading }: Props) {
  const t = useTranslations('transactions.screen')
  const locale = useLocale()

  if (isLoading && groups.length === 0) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />)}
      </div>
    )
  }
  if (groups.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t('empty')}</p>
  }

  const groupLabel = (dateKey: string) => {
    const rel = relativeDayLabel(dateKey, todayKey)
    if (rel) return t(rel)
    return new Date(dateKey + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.dateKey} className="flex flex-col gap-1">
          <h2 className="px-2 text-xs font-medium text-muted-foreground">{groupLabel(g.dateKey)}</h2>
          {g.items.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              categoryName={tx.category_id ? getCategoryName(tx.category_id) : t('uncategorized')}
              categoryColor={getCategoryColor(tx.category_id)}
              accountName={tx.account_id ? getAccountName(tx.account_id) : t('noAccount')}
              onSelect={onSelect}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
