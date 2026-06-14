'use client'

import { createElement } from 'react'
import { useTranslations } from 'next-intl'
import { LineChart, TrendingUp, PieChart, Landmark, Coins, CircleDollarSign, type LucideIcon } from 'lucide-react'
import { groupHoldingsByClass, gainLoss, type AssetClass, type HoldingLike } from '@/lib/portfolio-utils'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

const CLASS_ICON: Record<AssetClass, LucideIcon> = {
  IDX_STOCK: LineChart, US_STOCK: TrendingUp, MUTUAL_FUND: PieChart, ETF: Landmark, BOND: Coins, OTHER: CircleDollarSign,
}
const CLASS_TINT: Record<AssetClass, string> = {
  IDX_STOCK: 'bg-tint-blue-bg text-tint-blue-fg', US_STOCK: 'bg-tint-green-bg text-tint-green-fg',
  MUTUAL_FUND: 'bg-tint-purple-bg text-tint-purple-fg', ETF: 'bg-tint-teal-bg text-tint-teal-fg',
  BOND: 'bg-tint-amber-bg text-tint-amber-fg', OTHER: 'bg-tint-slate-bg text-tint-slate-fg',
}

interface HoldingsByClassListProps<H extends HoldingLike> {
  holdings: H[]
  onSelect: (holding: H) => void
}

/** Holdings grouped by asset class (design `NIYHN`). Each row taps to the manage sheet. */
export function HoldingsByClassList<H extends HoldingLike>({ holdings, onSelect }: HoldingsByClassListProps<H>) {
  const t = useTranslations('portfolio')
  const groups = groupHoldingsByClass(holdings)
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.assetClass} className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm leading-body-sm font-bold text-foreground">{t(`class.${g.assetClass}`)}</h2>
            <span className="text-tiny font-semibold text-muted-foreground">{formatCurrencyCompact(g.total, holdings[0]?.currency ?? 'IDR')}</span>
          </div>
          <div className="divide-y divide-muted rounded-2xl bg-card shadow-card">
            {g.holdings.map((h) => {
              const gl = gainLoss(h)
              const up = gl >= 0
              return (
                <button key={h.id} type="button" onClick={() => onSelect(h)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', CLASS_TINT[h.asset_class])} aria-hidden="true">
                    {createElement(CLASS_ICON[h.asset_class], { className: 'h-[18px] w-[18px]' })}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm leading-body-sm font-semibold text-foreground">{h.name}</span>
                    {h.symbol && <span className="text-tiny text-muted-foreground">{h.symbol}</span>}
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-sm leading-body-sm font-bold text-foreground">{formatCurrency(h.current_value, h.currency)}</span>
                    <span className={cn('text-tiny font-medium', up ? 'text-success' : 'text-destructive')}>
                      {up ? '+' : '−'}{formatCurrencyCompact(Math.abs(gl), h.currency)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
