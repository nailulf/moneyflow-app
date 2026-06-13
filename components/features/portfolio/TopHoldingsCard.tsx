'use client'

import { createElement } from 'react'
import { useTranslations } from 'next-intl'
import { TrendingUp, Landmark, LineChart, PieChart, Coins, CircleDollarSign, type LucideIcon } from 'lucide-react'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'
import type { AssetClass } from '@/lib/portfolio-utils'
import { cn } from '@/lib/utils'

export interface TopHoldingRow {
  id: string
  symbol: string | null
  name: string
  assetClass: AssetClass
  value: number
  gainLoss: number
  currency: string
}

const CLASS_ICON: Record<AssetClass, LucideIcon> = {
  IDX_STOCK: LineChart, US_STOCK: TrendingUp, MUTUAL_FUND: PieChart, ETF: Landmark, BOND: Coins, OTHER: CircleDollarSign,
}
const CLASS_TINT: Record<AssetClass, string> = {
  IDX_STOCK: 'bg-tint-blue-bg text-tint-blue-fg', US_STOCK: 'bg-tint-green-bg text-tint-green-fg',
  MUTUAL_FUND: 'bg-tint-purple-bg text-tint-purple-fg', ETF: 'bg-tint-teal-bg text-tint-teal-fg',
  BOND: 'bg-tint-amber-bg text-tint-amber-fg', OTHER: 'bg-tint-slate-bg text-tint-slate-fg',
}

interface TopHoldingsCardProps {
  rows: TopHoldingRow[]
}

/** Top holdings list (design `Sj58B`). */
export function TopHoldingsCard({ rows }: TopHoldingsCardProps) {
  const t = useTranslations('portfolio')
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-md leading-body-lg font-bold text-foreground">{t('top.title')}</h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-sm leading-body-sm text-muted-foreground shadow-card">{t('top.empty')}</p>
      ) : (
        <div className="divide-y divide-muted rounded-2xl bg-card shadow-card">
          {rows.map((row) => {
            const up = row.gainLoss >= 0
            return (
              <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', CLASS_TINT[row.assetClass])} aria-hidden="true">
                  {createElement(CLASS_ICON[row.assetClass], { className: 'h-[18px] w-[18px]' })}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm leading-body-sm font-semibold text-foreground">{row.name}</span>
                  {row.symbol && <span className="text-tiny text-muted-foreground">{row.symbol}</span>}
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="text-sm leading-body-sm font-bold text-foreground">{formatCurrency(row.value, row.currency)}</span>
                  <span className={cn('text-tiny font-medium', up ? 'text-success' : 'text-destructive')}>
                    {up ? '+' : '−'}{formatCurrencyCompact(Math.abs(row.gainLoss), row.currency)}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
