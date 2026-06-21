'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { Card, CardContent } from '@/components/ui/molecules/card'
import { ChartContainer } from '@/components/ui/organisms/chart'
import { formatCurrency } from '@/lib/data-utils'
import { computeBalanceChangePercent, type BalancePoint } from '@/lib/account-detail-utils'
import { cn } from '@/lib/utils'

function BalanceTooltip({ active, payload, label, currency }: { active?: boolean; payload?: { value: number }[]; label?: string; currency?: string }) {
  if (!active || !payload?.length) return null
  const formattedDate = label
    ? new Date(label + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : ''
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 px-3 py-2 shadow-floating backdrop-blur-sm">
      <p className="mb-0.5 text-xs text-muted-foreground">{formattedDate}</p>
      <p className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value, currency)}</p>
    </div>
  )
}

interface Props {
  series: BalancePoint[]
  currency: string
}

export function BalanceTrendCard({ series, currency }: Props) {
  const t = useTranslations('accountDetail')
  const gradientId = useId()
  if (series.length < 2) return null
  const pct = computeBalanceChangePercent(series)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p className="text-md leading-body-lg font-semibold text-foreground">{t('trend.title')}</p>
            <p className="text-xs leading-caption text-muted-foreground">{t('trend.subtitle')}</p>
          </div>
          {pct !== null && (
            <span className={cn('flex items-center gap-1 rounded-full px-2 py-1 text-tiny font-semibold', pct >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
              {pct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {t('trend.changeBadge', { value: `${pct >= 0 ? '+' : ''}${pct}%` })}
            </span>
          )}
        </div>
        <div className="h-[180px]">
          <ChartContainer config={{ balance: { label: t('trend.title'), color: 'hsl(var(--chart-1))' } }} className="h-full w-full">
            <AreaChart data={series} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={40} interval="preserveStartEnd" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(value) => new Date(value + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
              <YAxis hide domain={([dataMin, dataMax]: [number, number]) => { const padding = Math.max((dataMax - dataMin) * 0.1, dataMax * 0.02); return [Math.max(0, dataMin - padding), dataMax + padding] }} />
              <Tooltip content={<BalanceTooltip currency={currency} />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 2' }} />
              <Area type="monotone" dataKey="balance" stroke="hsl(var(--chart-1))" strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))', fill: 'hsl(var(--chart-1))' }} />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
