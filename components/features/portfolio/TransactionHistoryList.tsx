'use client'

import { useTranslations, useLocale } from 'next-intl'
import { ArrowDownCircle, ArrowUpCircle, Coins } from 'lucide-react'
import type { InvestmentTxn } from '@/lib/api/investment-transactions'
import type { AssetClass } from '@/lib/portfolio-utils'
import { sharesToLots } from '@/lib/portfolio-utils'
import { txnRowView } from '@/lib/portfolio-screen-utils'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

interface TransactionHistoryListProps {
  transactions: InvestmentTxn[]
  currency: string
  assetClass?: AssetClass
}

/** Localized label for a transaction type key from txnRowView. */
const TYPE_ICON = {
  'history.buy': ArrowDownCircle,
  'history.sell': ArrowUpCircle,
  'history.dividend': Coins,
} as const

type TypeKey = keyof typeof TYPE_ICON

const TYPE_COLOR: Record<TypeKey, string> = {
  'history.buy': 'text-success',
  'history.sell': 'text-destructive',
  'history.dividend': 'text-primary',
}

function formatDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

/**
 * "Transaction History" card (design: `portfolio.history.*`).
 * Rows are rendered in the order they are received (the API returns newest-first).
 * Each row shows: type icon + label, signed quantity, formatted total, date.
 */
export function TransactionHistoryList({ transactions, currency, assetClass }: TransactionHistoryListProps) {
  const t = useTranslations('portfolio')
  const locale = useLocale()
  const isIDX = assetClass === 'IDX_STOCK'

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <h2 className="text-sm leading-body-sm font-semibold text-foreground">{t('history.title')}</h2>
      </div>

      {transactions.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm leading-body-sm text-muted-foreground">{t('history.empty')}</p>
        </div>
      ) : (
        <ul>
          {transactions.map((txn, idx) => {
            const row = txnRowView(txn)
            const typeKey = row.typeKey as TypeKey
            const Icon = TYPE_ICON[typeKey] ?? ArrowDownCircle
            const colorClass = TYPE_COLOR[typeKey] ?? 'text-foreground'

            // txnRowView uses Unicode minus '−' (U+2212) for SELL, '+' for BUY/DIVIDEND
            const sign = txn.type === 'SELL' ? '−' : '+'
            const rawQty = txn.quantity
            const displayQty = isIDX ? sharesToLots(rawQty) : rawQty
            const unitLabel = isIDX ? t('unit.lots') : t('unit.units')
            const signedQtyDisplay = `${sign}${displayQty} ${unitLabel}`

            return (
              <li
                key={txn.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  idx < transactions.length - 1 && 'border-b border-border',
                )}
              >
                {/* Type icon */}
                <span className={cn('shrink-0', colorClass)} aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>

                {/* Label + quantity */}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm leading-body-sm font-semibold text-foreground">
                    {t(row.typeKey as Parameters<typeof t>[0])}
                  </span>
                  <span className="text-tiny text-muted-foreground">{signedQtyDisplay}</span>
                </span>

                {/* Total + date (right-aligned) */}
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-sm leading-body-sm font-semibold text-foreground">
                    {formatCurrency(row.total, currency)}
                  </span>
                  <span className="text-tiny text-muted-foreground">{formatDate(row.date, locale)}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
