'use client'

import { useTranslations } from 'next-intl'
import { formatCurrencyCompact } from '@/lib/data-utils'

interface ForecastHeroProps {
  projectedNetWorth: number | null
  currentNetWorth: number | null
  targetNetWorth: number
  successRate: number | null
  horizonYears: number
  endYear: number
}

export function ForecastHero({
  projectedNetWorth,
  currentNetWorth,
  targetNetWorth,
  successRate,
  horizonYears,
  endYear,
}: ForecastHeroProps) {
  const t = useTranslations('forecast.root')
  const projected = projectedNetWorth ?? 0
  const hasGoal = targetNetWorth > 0
  const pct = hasGoal ? Math.min(100, Math.max(0, Math.round((projected / targetNetWorth) * 100))) : 0

  return (
    <div className="flex flex-col gap-3.5 rounded-[20px] bg-hero-gradient p-5 text-hero-foreground shadow-card">
      <p className="text-tiny font-semibold tracking-wide text-hero-muted">
        {t('eyebrow', { years: horizonYears, year: endYear })}
      </p>
      <p className="text-3xl font-bold">{formatCurrencyCompact(projected)}</p>
      {hasGoal && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span>{t('toGoal', { pct })}</span>
            <span className="text-hero-muted">{t('target', { amount: formatCurrencyCompact(targetNetWorth) })}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-hero-foreground/15">
            <div className="h-full rounded-full bg-hero-foreground" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-hero-foreground/20 pt-3">
        {[
          { label: t('successRate'), value: successRate !== null ? `${successRate}%` : '—' },
          { label: t('today'), value: formatCurrencyCompact(currentNetWorth ?? 0) },
          { label: t('horizon'), value: t('years', { n: horizonYears }) },
        ].map((s, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <span className="text-tiny text-hero-muted">{s.label}</span>
            <span className="text-sm font-bold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
