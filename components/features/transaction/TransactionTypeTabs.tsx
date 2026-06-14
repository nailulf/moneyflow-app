'use client'

import { useTranslations } from 'next-intl'
import { SegmentedControl } from '@/components/features/accounts/create/SegmentedControl'
import type { TransactionTypeFilter } from '@/lib/transaction-filters'

const VALUES: TransactionTypeFilter[] = ['ALL', 'INCOME', 'EXPENSE', 'TRANSFER']
const KEY: Record<TransactionTypeFilter, string> = { ALL: 'all', INCOME: 'income', EXPENSE: 'expense', TRANSFER: 'transfer' }

interface Props {
  value: TransactionTypeFilter
  onValueChange: (v: TransactionTypeFilter) => void
}

/** Pill segmented type filter (design `kp7fu`), on the shared SegmentedControl. */
export function TransactionTypeTabs({ value, onValueChange }: Props) {
  const t = useTranslations('transactions.screen.tabs')
  return (
    <SegmentedControl
      options={VALUES.map((v) => ({ value: v, label: t(KEY[v]) }))}
      value={value}
      onChange={onValueChange}
    />
  )
}
