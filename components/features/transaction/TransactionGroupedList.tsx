'use client'

import { useLocale, useTranslations } from 'next-intl'
import type { Transaction } from '@/types/database'
import { type TransactionGroup, relativeDayLabel } from '@/lib/transaction-filters'
import { TransactionRow } from './TransactionRow'
import { Button } from '@/components/ui/atoms/button'

interface Props {
  groups: TransactionGroup[]
  todayKey: string
  getCategoryName: (id: string | null) => string
  getAccountName: (id: string | null) => string
  onSelect: (t: Transaction) => void
  isLoading: boolean
  isFiltered?: boolean
  onReset?: () => void
}

export function TransactionGroupedList({ groups, todayKey, getCategoryName, getAccountName, onSelect, isLoading, isFiltered = false, onReset }: Props) {
  const t = useTranslations('transactions.screen')
  const locale = useLocale()

  if (isLoading && groups.length === 0) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-card shadow-card" />)}
      </div>
    )
  }
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">{isFiltered ? t('emptyFiltered') : t('empty')}</p>
        {isFiltered && onReset && (
          <Button variant="outline" size="sm" onClick={onReset}>{t('reset')}</Button>
        )}
      </div>
    )
  }

  const groupLabel = (dateKey: string) => {
    const rel = relativeDayLabel(dateKey, todayKey)
    if (rel) return t(rel)
    return new Date(dateKey + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.dateKey} className="flex flex-col gap-1.5">
          <h2 className="px-2 text-xs leading-caption font-medium text-muted-foreground">{groupLabel(g.dateKey)}</h2>
          <div className="divide-y divide-muted overflow-hidden rounded-2xl bg-card shadow-card">
            {g.items.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                categoryName={tx.category_id ? getCategoryName(tx.category_id) : t('uncategorized')}
                accountName={tx.account_id ? getAccountName(tx.account_id) : t('noAccount')}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
