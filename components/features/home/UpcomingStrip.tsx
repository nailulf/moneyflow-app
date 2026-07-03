'use client'

import { useTranslations } from 'next-intl'
import { CalendarClock } from 'lucide-react'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'
import { HomeEmptyState } from './HomeEmptyState'

export interface UpcomingTile {
  id: string
  name: string
  categoryName: string
  amount: number
  currency: string
  dayLabel: string  // localized short weekday, e.g. "Sun"
  dayNumber: number // day of month
}

interface UpcomingStripProps {
  items: UpcomingTile[]
}

// The date strip always shows 4 equal-width slots (design `lowJu`); with fewer
// upcoming payments the trailing slots render as ghost tiles so a single item
// doesn't stretch to the full card width.
const STRIP_SLOTS = 4

/** Upcoming scheduled payments date strip (design `RlUR0`); nearest tile is navy. */
export function UpcomingStrip({ items }: UpcomingStripProps) {
  const t = useTranslations('home')

  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-md leading-body-lg font-bold text-foreground">{t('upcoming.title')}</h2>
        <HomeEmptyState
          icon={CalendarClock}
          bubbleClassName="bg-muted"
          iconClassName="text-muted-foreground"
          title={t('upcoming.emptyTitle')}
          description={t('upcoming.emptyHint')}
        />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-md leading-body-lg font-bold text-foreground">{t('upcoming.title')}</h2>
      </div>
      <div className="rounded-2xl bg-card p-3.5 shadow-card">
        <p className="text-xs leading-caption text-muted-foreground">{t('upcoming.subtitle')}</p>
        <div className="mt-3 flex gap-2">
            {items.map((item, i) => {
              const first = i === 0
              const Icon = getCategoryIcon(item.categoryName)
              const tint = getCategoryTint(item.categoryName)
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex min-w-0 flex-1 flex-col items-center gap-2 rounded-[14px] px-2 py-2.5',
                    first ? 'bg-primary text-primary-foreground' : 'border border-muted bg-muted/50'
                  )}
                >
                  <span className={cn('text-nano font-medium leading-none', first ? 'text-primary-foreground/70 dark:text-primary-foreground' : 'text-muted-foreground')}>
                    {item.dayLabel}
                  </span>
                  <span className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    first ? 'bg-primary-foreground/20' : 'border border-border bg-card text-foreground'
                  )}>
                    {item.dayNumber}
                  </span>
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', first ? 'bg-primary-foreground/20' : tint.bg)}>
                    <Icon className={cn('h-3.5 w-3.5', first ? 'text-primary-foreground' : tint.fg)} aria-hidden="true" />
                  </span>
                  <span className={cn('w-full truncate text-center text-nano font-medium leading-none', first ? 'text-primary-foreground' : 'text-muted-foreground')}>
                    {item.name}
                  </span>
                  <span className={cn('text-nano font-medium leading-none', first ? 'text-primary-foreground' : 'text-foreground')}>
                    {formatCurrencyCompact(item.amount, item.currency)}
                  </span>
                </div>
              )
            })}
            {Array.from({ length: Math.max(0, STRIP_SLOTS - items.length) }, (_, i) => (
              <div
                key={`placeholder-${i}`}
                data-testid="upcoming-placeholder"
                aria-hidden="true"
                className="flex min-w-0 flex-1 items-center justify-center rounded-[14px] border border-dashed border-border"
              >
                <CalendarClock className="h-4 w-4 text-muted-foreground/40" />
              </div>
            ))}
        </div>
      </div>
    </section>
  )
}
