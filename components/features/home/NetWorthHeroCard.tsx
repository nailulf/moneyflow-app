'use client'

import { useTranslations } from 'next-intl'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

export interface HeroMonth {
  label: string
  spending: number
  netWorth: number
}

interface NetWorthHeroCardProps {
  netWorth: number
  changePercentage: number
  currency: string
  months: HeroMonth[] // oldest first; last entry = current month
  income: number      // current month
  expenses: number    // current month
}

const CHART_W = 350
const CHART_H = 80
const BAR_W = 36

/** Navy hero card (design `u8yOSE`): spending bars + net-worth line + I/E/S footer. */
export function NetWorthHeroCard({
  netWorth, changePercentage, currency, months, income, expenses,
}: NetWorthHeroCardProps) {
  const t = useTranslations('home')
  const saved = income - expenses
  const up = changePercentage >= 0
  const pct = `${up ? '+' : ''}${changePercentage.toFixed(1)}`

  const n = months.length
  const maxSpend = Math.max(1, ...months.map((m) => m.spending))
  const nwValues = months.map((m) => m.netWorth)
  const nwMin = Math.min(...nwValues)
  const nwMax = Math.max(...nwValues)
  const nwSpan = nwMax - nwMin || 1
  const slot = n > 0 ? CHART_W / n : CHART_W
  const xCenter = (i: number) => slot * i + slot / 2
  const lineY = (v: number) => 8 + (1 - (v - nwMin) / nwSpan) * (CHART_H - 20)
  const linePoints = months.map((m, i) => `${xCenter(i)},${lineY(m.netWorth)}`).join(' ')
  const last = n - 1

  return (
    <section className="rounded-[20px] bg-hero-gradient p-5 text-hero-foreground">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs leading-caption text-hero-muted">{t('hero.totalNetWorth')}</p>
        <span className={cn(
          'flex items-center gap-1 rounded-xl px-2 py-0.5 text-[11px] font-semibold',
          up ? 'bg-hero-success/20 text-hero-success' : 'bg-hero-danger/20 text-hero-danger'
        )}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {t('hero.thisMonth', { pct })}
        </span>
      </div>

      <p className="mt-2 text-3xl font-bold leading-title-2">{formatCurrency(netWorth, currency)}</p>

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="mt-3 h-20 w-full" aria-hidden="true">
        {months.map((m, i) => {
          const h = Math.max(2, (m.spending / maxSpend) * (CHART_H - 20))
          return (
            <rect
              key={m.label + i}
              data-bar
              x={xCenter(i) - BAR_W / 2}
              y={CHART_H - h}
              width={BAR_W}
              height={h}
              rx={3}
              className={i === last ? 'fill-hero-foreground/20' : 'fill-hero-foreground/10'}
            />
          )
        })}
        {n > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-hero-foreground"
          />
        )}
        {n > 0 && (
          <circle cx={xCenter(last)} cy={lineY(months[last].netWorth)} r={4} className="fill-hero-foreground" />
        )}
      </svg>

      <div className="mt-1 flex justify-between">
        {months.map((m, i) => (
          <span
            key={m.label + i}
            className={cn('text-[11px] leading-none', i === last ? 'font-semibold text-hero-foreground' : 'text-hero-muted')}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-3.5">
        <span className="flex items-center gap-1.5 text-[11px] text-hero-muted">
          <span className="h-0.5 w-4 rounded-full bg-hero-foreground" aria-hidden="true" />
          {t('hero.legendNetWorth')}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-hero-muted">
          <span className="h-2.5 w-2.5 rounded-sm bg-hero-foreground/20" aria-hidden="true" />
          {t('hero.legendSpending')}
        </span>
      </div>

      <div className="mt-3.5 flex gap-4 border-t border-hero-foreground/10 pt-3">
        <div className="min-w-0">
          <p className="text-[11px] text-hero-muted">{t('hero.income')}</p>
          <p className="truncate text-sm leading-body-sm font-semibold text-hero-success">
            + {formatCurrency(income, currency)}
          </p>
        </div>
        <div className="w-px self-stretch bg-hero-foreground/15" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[11px] text-hero-muted">{t('hero.expenses')}</p>
          <p className="truncate text-sm leading-body-sm font-semibold text-hero-danger">
            − {formatCurrency(expenses, currency)}
          </p>
        </div>
        <div className="w-px self-stretch bg-hero-foreground/15" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[11px] text-hero-muted">{t('hero.saved')}</p>
          <p className="truncate text-sm leading-body-sm font-semibold">{formatCurrency(saved, currency)}</p>
        </div>
      </div>
    </section>
  )
}
