'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'
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

// Monotone cubic (Fritsch–Carlson) through the month points — smooth like a
// spline but never overshoots the data, so the line can't suggest a dip or
// peak that didn't happen between two months.
function monotonePath(points: Array<[number, number]>): string {
  const k = points.length
  if (k === 0) return ''
  if (k === 1) return `M${points[0][0]},${points[0][1]}`
  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < k - 1; i++) {
    dx.push(points[i + 1][0] - points[i][0])
    slope.push((points[i + 1][1] - points[i][1]) / dx[i])
  }
  const tangent = [slope[0]]
  for (let i = 1; i < k - 1; i++) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : 2 / (1 / slope[i - 1] + 1 / slope[i]))
  }
  tangent.push(slope[k - 2])
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < k - 1; i++) {
    const h = dx[i] / 3
    d += `C${points[i][0] + h},${points[i][1] + tangent[i] * h} ${points[i + 1][0] - h},${points[i + 1][1] - tangent[i + 1] * h} ${points[i + 1][0]},${points[i + 1][1]}`
  }
  return d
}

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
  const nwSpan = nwMax - nwMin
  const slot = n > 0 ? CHART_W / n : CHART_W
  const barW = Math.min(BAR_W, Math.max(8, slot - 4))
  const xCenter = (i: number) => slot * i + slot / 2
  // Flat history (incl. single-month users) centers the line instead of pinning it low.
  const lineY = (v: number) =>
    nwSpan === 0 ? CHART_H / 2 - 2 : 8 + (1 - (v - nwMin) / nwSpan) * (CHART_H - 20)
  const lineD = monotonePath(months.map((m, i) => [xCenter(i), lineY(m.netWorth)]))
  const last = n - 1
  const gradientId = useId()
  // A flat history would paint the fade as a solid wash over half the chart —
  // only show the area when the line actually moves.
  const showArea = n > 1 && nwSpan > 0

  // Tap-to-inspect: tapping a month slot pins a dashed guideline + a value
  // chip for that month; tapping the same slot again dismisses it.
  const [selected, setSelected] = useState<number | null>(null)
  const sel = selected !== null && selected < n ? selected : null

  return (
    <section className="rounded-[20px] bg-hero-gradient p-5 text-hero-foreground">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs leading-caption text-hero-muted">{t('hero.totalNetWorth')}</p>
        <span className={cn(
          'flex items-center gap-1 rounded-xl px-2 py-0.5 text-tiny font-semibold',
          up ? 'bg-hero-success/20 text-hero-success' : 'bg-hero-danger/20 text-hero-danger'
        )}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {t('hero.thisMonth', { pct })}
        </span>
      </div>

      <p className="mt-2 text-3xl font-bold leading-title-2">{formatCurrency(netWorth, currency)}</p>

      <div className="relative mt-3">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-20 w-full" aria-hidden="true">
        {months.map((m, i) => {
          const h = Math.max(2, (m.spending / maxSpend) * (CHART_H - 20))
          return (
            <rect
              key={m.label + i}
              data-bar
              x={xCenter(i) - barW / 2}
              y={CHART_H - h}
              width={barW}
              height={h}
              rx={3}
              className={i === last ? 'fill-hero-foreground/20' : 'fill-hero-foreground/10'}
            />
          )
        })}
        {n > 1 && (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="hsl(var(--hero-foreground))" stopOpacity="0.22" />
                <stop offset="1" stopColor="hsl(var(--hero-foreground))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {showArea && (
              <path
                data-area
                d={`${lineD}L${xCenter(last)},${CHART_H}L${xCenter(0)},${CHART_H}Z`}
                fill={`url(#${gradientId})`}
              />
            )}
            <path
              data-line
              d={lineD}
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-hero-foreground"
            />
          </>
        )}
        {n > 0 && (
          <circle cx={xCenter(last)} cy={lineY(months[last].netWorth)} r={4} className="fill-hero-foreground" />
        )}
        {sel !== null && (
          <>
            <line
              data-guideline
              x1={xCenter(sel)}
              y1={0}
              x2={xCenter(sel)}
              y2={CHART_H}
              strokeWidth={1}
              strokeDasharray="3 3"
              className="stroke-hero-foreground/50"
            />
            <circle
              cx={xCenter(sel)}
              cy={lineY(months[sel].netWorth)}
              r={4.5}
              strokeWidth={2}
              className="fill-hero-foreground stroke-hero-foreground/40"
            />
          </>
        )}
        {months.map((m, i) => (
          <rect
            key={`hit-${m.label}-${i}`}
            data-hit
            x={slot * i}
            y={0}
            width={slot}
            height={CHART_H}
            fill="transparent"
            onClick={() => setSelected((s) => (s === i ? null : i))}
          />
        ))}
      </svg>
      {sel !== null && (
        <div
          data-testid="hero-tooltip"
          className="pointer-events-none absolute top-0 -translate-x-1/2"
          style={{ left: `${Math.min(86, Math.max(14, (xCenter(sel) / CHART_W) * 100))}%` }}
        >
          <div className="flex flex-col gap-1 rounded-lg bg-hero-foreground/15 px-2 py-1.5 backdrop-blur-sm">
            <span className="text-nano leading-none text-hero-muted">{months[sel].label}</span>
            <span className="flex items-center gap-1.5 text-tiny font-semibold leading-none">
              <span className="h-0.5 w-3 shrink-0 rounded-full bg-hero-foreground" aria-hidden="true" />
              {formatCurrencyCompact(months[sel].netWorth, currency)}
            </span>
            <span className="flex items-center gap-1.5 text-tiny leading-none text-hero-muted">
              <span className="h-2 w-2 shrink-0 rounded-sm bg-hero-foreground/25" aria-hidden="true" />
              {formatCurrencyCompact(months[sel].spending, currency)}
            </span>
          </div>
        </div>
      )}
      </div>

      <div className="mt-1 flex justify-between">
        {months.map((m, i) => (
          <span
            key={m.label + i}
            className={cn('text-tiny leading-none', i === (sel ?? last) ? 'font-semibold text-hero-foreground' : 'text-hero-muted')}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-3.5">
        <span className="flex items-center gap-1.5 text-tiny text-hero-muted">
          <span className="h-0.5 w-4 rounded-full bg-hero-foreground" aria-hidden="true" />
          {t('hero.legendNetWorth')}
        </span>
        <span className="flex items-center gap-1.5 text-tiny text-hero-muted">
          <span className="h-2.5 w-2.5 rounded-sm bg-hero-foreground/20" aria-hidden="true" />
          {t('hero.legendSpending')}
        </span>
      </div>

      <div className="mt-3.5 flex gap-4 border-t border-hero-foreground/10 pt-3">
        <div className="min-w-0">
          <p className="text-tiny text-hero-muted">{t('hero.income')}</p>
          <p className="truncate text-sm leading-body-sm font-semibold text-hero-success">
            + {formatCurrency(income, currency)}
          </p>
        </div>
        <div className="w-px self-stretch bg-hero-foreground/15" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-tiny text-hero-muted">{t('hero.expenses')}</p>
          <p className="truncate text-sm leading-body-sm font-semibold text-hero-danger">
            − {formatCurrency(expenses, currency)}
          </p>
        </div>
        <div className="w-px self-stretch bg-hero-foreground/15" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-tiny text-hero-muted">{t('hero.saved')}</p>
          <p className="truncate text-sm leading-body-sm font-semibold">{formatCurrency(saved, currency)}</p>
        </div>
      </div>
    </section>
  )
}
