'use client'

import { Check, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/atoms/button'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import type { TxnType } from '@/lib/transaction-form'

export interface TransactionSummary {
  type: TxnType
  amount: number
  categoryName: string | null
  accountName: string | null
  toAccountName: string | null
  date: string
  currency: string
}

export interface TransactionSuccessViewProps {
  mode: 'create' | 'edit'
  summary: TransactionSummary
  onDone: () => void
  onAddAnother: () => void
}

export function TransactionSuccessView({
  mode,
  summary,
  onDone,
  onAddAnother,
}: TransactionSuccessViewProps) {
  const { type, amount, categoryName, accountName, toAccountName, date, currency } = summary

  // Amount display
  const formattedAmount = amount.toLocaleString('id-ID')
  const isIncome = type === 'INCOME'
  const isExpense = type === 'EXPENSE'
  const isTransfer = type === 'TRANSFER'

  const amountPrefix = isIncome ? '+' : isExpense ? '−' : ''
  const amountColorClass = isIncome
    ? 'text-success'
    : isExpense
    ? 'text-destructive'
    : 'text-foreground'

  // Category icon/tint (used for non-transfer)
  const CategoryIcon = getCategoryIcon(categoryName)
  const tint = getCategoryTint(categoryName)

  // Transfer tint uses a neutral "transfer" keyword
  const transferTint = getCategoryTint('transfer')
  const TransferIcon = getCategoryIcon('transfer')

  // Formatted date
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col items-center gap-6 px-5 py-8">
      {/* Success icon */}
      <div
        className={cn(
          'flex size-16 items-center justify-center rounded-full',
          'bg-success/10',
        )}
      >
        <Check className="size-8 text-success" strokeWidth={2.5} />
      </div>

      {/* Title + subtitle */}
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="text-xl leading-title-4 font-semibold text-foreground">
          {mode === 'create' ? 'Transaction added' : 'Transaction updated'}
        </h2>
        {accountName && (
          <p className="text-sm leading-body-sm text-muted-foreground">
            Saved to {accountName}
          </p>
        )}
      </div>

      {/* Summary card */}
      <div className="w-full rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: category or transfer route */}
          <div className="flex items-center gap-3 min-w-0">
            {isTransfer ? (
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  transferTint.bg,
                )}
              >
                <TransferIcon className={cn('size-5', transferTint.fg)} />
              </div>
            ) : (
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  tint.bg,
                )}
              >
                <CategoryIcon className={cn('size-5', tint.fg)} />
              </div>
            )}

            <div className="min-w-0">
              {isTransfer ? (
                <p className="text-sm leading-body-sm font-medium text-foreground truncate">
                  {accountName}
                  {toAccountName && (
                    <>
                      {' '}
                      <ArrowRight className="inline size-3" />
                      {' '}
                      {toAccountName}
                    </>
                  )}
                </p>
              ) : (
                <p className="text-sm leading-body-sm font-medium text-foreground truncate">
                  {categoryName ?? 'Uncategorized'}
                </p>
              )}
              <p className="text-xs leading-caption text-muted-foreground">
                {displayDate} · {currency}
              </p>
            </div>
          </div>

          {/* Right: signed amount */}
          <p className={cn('text-md leading-body-lg font-semibold shrink-0', amountColorClass)}>
            {amountPrefix}
            {formattedAmount}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex w-full flex-col gap-3">
        <Button
          type="button"
          onClick={onDone}
          className="h-[52px] rounded-[14px] w-full bg-primary text-primary-foreground"
        >
          Done
        </Button>

        {mode === 'create' && (
          <Button
            type="button"
            variant="outline"
            onClick={onAddAnother}
            className={cn(
              'h-[52px] rounded-[14px] w-full',
              'border-primary text-primary',
              'hover:bg-primary/5 hover:text-primary',
            )}
          >
            Add another
          </Button>
        )}
      </div>
    </div>
  )
}
