'use client'

import type { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

interface TransactionRowProps {
  transaction: Transaction
  categoryName: string
  categoryColor: string
  accountName: string
  onSelect: (transaction: Transaction) => void
}

export function TransactionRow({ transaction, categoryName, categoryColor, accountName, onSelect }: TransactionRowProps) {
  const isIncome = transaction.type === 'INCOME'
  const isExpense = transaction.type === 'EXPENSE'
  const sign = isIncome ? '+' : isExpense ? '-' : ''
  const amountClass = isIncome ? 'text-success' : isExpense ? 'text-destructive' : 'text-foreground'
  const title = transaction.merchant?.trim() || transaction.description?.trim() || categoryName

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted/50"
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
        style={{ backgroundColor: categoryColor, color: 'hsl(var(--primary-foreground))' }}
        aria-hidden="true"
      >
        {categoryName.slice(0, 1).toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{accountName}</span>
      </span>
      <span className={cn('shrink-0 text-sm font-semibold', amountClass)}>
        {sign} {formatCurrency(Math.abs(transaction.amount), transaction.currency ?? 'IDR')}
      </span>
    </button>
  )
}
