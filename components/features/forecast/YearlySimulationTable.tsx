'use client'
import { useTranslations } from 'next-intl'
import type { YearlySimulationRow } from '@/hooks/useYearlySimulation'
import { LIFE_EVENT_COLORS, type LifeEventCategory } from '@/lib/forecast/types'
import { formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

export function YearlySimulationTable({ rows }: { rows: YearlySimulationRow[] }) {
  const t = useTranslations('forecast')
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="flex-1 text-tiny font-semibold uppercase tracking-wide text-muted-foreground">{t('colYear')}</span>
        <span className="w-20 text-right text-tiny font-semibold uppercase tracking-wide text-muted-foreground">{t('colIncome')}</span>
        <span className="w-20 text-right text-tiny font-semibold uppercase tracking-wide text-muted-foreground">{t('colExpense')}</span>
        <span className="w-24 text-right text-tiny font-semibold uppercase tracking-wide text-muted-foreground">{t('colNetWorth')}</span>
      </div>
      {rows.map((row) => {
        const hasEvent = row.eventLabels.length > 0
        return (
          <div key={row.year} className={cn('flex items-center gap-2 border-b border-border px-4 py-3 last:border-b-0', hasEvent && 'bg-muted/30')}>
            <div className="flex flex-1 items-center gap-2">
              {hasEvent && (
                <span data-testid="event-dot" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: LIFE_EVENT_COLORS[row.eventTypes[0] as LifeEventCategory] }} />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{row.year}</span>
                <span className="text-tiny text-muted-foreground">{row.ageLabel}</span>
              </div>
            </div>
            <span className="w-20 text-right text-sm text-success">+{formatCurrencyCompact(row.income)}</span>
            <span className="w-20 text-right text-sm text-destructive">−{formatCurrencyCompact(row.expense)}</span>
            <span className="w-24 text-right text-sm font-semibold text-foreground">{formatCurrencyCompact(row.endNW)}</span>
          </div>
        )
      })}
    </div>
  )
}
