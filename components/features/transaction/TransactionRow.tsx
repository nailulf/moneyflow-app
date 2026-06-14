'use client'

import { createElement } from 'react'
import type { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { cn } from '@/lib/utils'

interface TransactionRowProps {
  transaction: Transaction
  categoryName: string
  accountName: string
  onSelect: (transaction: Transaction) => void
}

export function TransactionRow({ transaction, categoryName, accountName, onSelect }: TransactionRowProps) {
  const isIncome = transaction.type === 'INCOME'
  const isExpense = transaction.type === 'EXPENSE'
  const sign = isIncome ? '+' : isExpense ? '-' : ''
  const amountClass = isIncome ? 'text-success' : isExpense ? 'text-destructive' : 'text-foreground'
  const title = transaction.merchant?.trim() || transaction.description?.trim() || categoryName
  const tint = getCategoryTint(categoryName)

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className="flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tint.bg)} aria-hidden="true">
        {createElement(getCategoryIcon(categoryName), { className: cn('size-[18px]', tint.fg) })}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm leading-none font-medium text-foreground">{title}</span>
        <span className="self-start rounded-full bg-muted px-2 py-0.5 text-tiny font-medium text-muted-foreground">
          {accountName}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn('text-sm leading-none font-semibold', amountClass)}>
          {sign ? `${sign} ` : ''}{formatCurrency(Math.abs(transaction.amount), transaction.currency ?? 'IDR')}
        </span>
        <span className={cn('rounded-lg px-1.5 py-0.5 text-tiny font-semibold', tint.bg, tint.fg)}>
          {categoryName}
        </span>
      </span>
    </button>
  )
}
