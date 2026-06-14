'use client'

import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/data-utils'

interface TodayCardProps {
  dateLabel: string
  spent: number
  count: number
  currency: string
}

/** Today hook card (design `NT75z`) — streak pill & quick-add chips are deferred features. */
export function TodayCard({ dateLabel, spent, count, currency }: TodayCardProps) {
  const t = useTranslations('home')
  return (
    <section className="rounded-2xl bg-card p-3.5 shadow-card">
      <p className="text-xs leading-caption font-semibold text-muted-foreground">{dateLabel}</p>
      <p className="text-lg leading-body-lg font-bold text-foreground">
        {formatCurrency(spent, currency)}
        <span className="ml-1.5 text-sm leading-body-sm font-medium text-muted-foreground">
          · {t('today.logged', { count })}
        </span>
      </p>
    </section>
  )
}
