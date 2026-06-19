'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Receipt } from 'lucide-react'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'
import { HomeEmptyState } from './HomeEmptyState'

export interface ExpenseRow {
  id: string
  name: string
  categoryName: string
  amount: number // absolute value
  currency: string
}

interface BiggestExpensesCardProps {
  rows: ExpenseRow[]
}

/** Biggest expenses this month (design `IlvC4`), top-3 ranked rows. */
export function BiggestExpensesCard({ rows }: BiggestExpensesCardProps) {
  const t = useTranslations('home')

  if (rows.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-md leading-body-lg font-bold text-foreground">{t('biggest.title')}</h2>
        <HomeEmptyState
          icon={Receipt}
          bubbleClassName="bg-muted"
          iconClassName="text-muted-foreground"
          title={t('biggest.emptyTitle')}
          description={t('biggest.emptyHint')}
        />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-md leading-body-lg font-bold text-foreground">{t('biggest.title')}</h2>
        <Link href="/transactions" className="text-sm leading-body-sm text-primary">{t('biggest.seeAll')}</Link>
      </div>
      <div className="rounded-2xl bg-card shadow-card">
        {
          rows.map((row, i) => {
            const Icon = getCategoryIcon(row.categoryName)
            const tint = getCategoryTint(row.categoryName)
            return (
              <div
                key={row.id}
                className={cn('flex items-center gap-3 px-4 py-3', i < rows.length - 1 && 'border-b border-muted')}
              >
                <span className={cn(
                  'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-nano font-bold',
                  i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {i + 1}
                </span>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tint.bg)}>
                  <Icon className={cn('h-[18px] w-[18px]', tint.fg)} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm leading-body-sm font-medium text-foreground">{row.name}</span>
                  <span className={cn('max-w-full self-start truncate rounded-lg px-1.5 py-0.5 text-nano font-normal', tint.bg, tint.fg)}>
                    {row.categoryName}
                  </span>
                </span>
                <span className="shrink-0 text-sm leading-body-sm font-bold text-destructive">
                  − {formatCurrency(row.amount, row.currency)}
                </span>
              </div>
            )
          })
        }
      </div>
    </section>
  )
}
