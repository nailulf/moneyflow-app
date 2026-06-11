'use client'

import { useTranslations } from 'next-intl'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/molecules/tabs'
import type { TransactionTypeFilter } from '@/lib/transaction-filters'

const VALUES: TransactionTypeFilter[] = ['ALL', 'INCOME', 'EXPENSE', 'TRANSFER']
const KEY: Record<TransactionTypeFilter, string> = { ALL: 'all', INCOME: 'income', EXPENSE: 'expense', TRANSFER: 'transfer' }

interface Props {
  value: TransactionTypeFilter
  onValueChange: (v: TransactionTypeFilter) => void
}

export function TransactionTypeTabs({ value, onValueChange }: Props) {
  const t = useTranslations('transactions.screen.tabs')
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as TransactionTypeFilter)}>
      <TabsList className="grid w-full grid-cols-4">
        {VALUES.map((v) => (
          <TabsTrigger key={v} value={v}>{t(KEY[v])}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
