'use client'

import { createElement } from 'react'
import { useTranslations } from 'next-intl'
import { LineChart, TrendingUp, PieChart, Landmark, Coins, CircleDollarSign, type LucideIcon } from 'lucide-react'
import { groupHoldingsByClass, type AssetClass, type HoldingLike } from '@/lib/portfolio-utils'
import { assetPositionView } from '@/lib/portfolio-screen-utils'
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
/** Header text color for each class (matches tint fg, used on the group header label). */
const CLASS_LABEL_COLOR: Record<AssetClass, string> = {
  IDX_STOCK: 'text-tint-blue-fg', US_STOCK: 'text-tint-green-fg',
  MUTUAL_FUND: 'text-tint-purple-fg', ETF: 'text-tint-teal-fg',
  BOND: 'text-tint-amber-fg', OTHER: 'text-tint-slate-fg',
}

/** Short ticker label for the badge: symbol if present, else first 4 chars of name. */
function tickerLabel(h: Pick<HoldingLike, 'symbol' | 'name'>): string {
  if (h.symbol) return h.symbol.toUpperCase().slice(0, 5)
  return h.name.slice(0, 4).toUpperCase()
}

interface HoldingsByClassListProps<H extends HoldingLike> {
  holdings: H[]
  /** Called when a row is tapped. On the account detail page this navigates to the asset detail route. */
  onSelect: (holding: H) => void
}

/** Holdings grouped by asset class (design `NIYHN`).
 *  Each row taps to the asset detail route — caller supplies the navigation via `onSelect`.
 *  Per-row gain is omitted here (live price data is SP3); only book value is shown. */
export function HoldingsByClassList<H extends HoldingLike>({ holdings, onSelect }: HoldingsByClassListProps<H>) {
  const t = useTranslations('portfolio')
  const groups = groupHoldingsByClass(holdings)
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.assetClass} className="flex flex-col gap-0 overflow-hidden rounded-2xl bg-card shadow-card">
          {/* Group header — inside the card, with a bottom border separator */}
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
            <span className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center', CLASS_LABEL_COLOR[g.assetClass])} aria-hidden="true">
              {createElement(CLASS_ICON[g.assetClass], { className: 'h-[18px] w-[18px]' })}
            </span>
            <h2 className={cn('flex-1 text-sm leading-body-sm font-semibold', CLASS_LABEL_COLOR[g.assetClass])}>{t(`class.${g.assetClass}`)}</h2>
            <span className="text-sm leading-body-sm font-semibold text-foreground">{formatCurrencyCompact(g.total, holdings[0]?.currency ?? 'IDR')}</span>
          </div>
          {/* Holding rows */}
          {g.holdings.map((h, idx) => {
            const { quantityLabel } = assetPositionView(h)
            const unitWord = h.asset_class === 'IDX_STOCK' ? t('unit.lots') : t('unit.units')
            const [qty] = quantityLabel.split(' ')
            const subtitle = `${qty} ${unitWord}`
            return (
              <button key={h.id} type="button" onClick={() => onSelect(h)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                  idx < g.holdings.length - 1 && 'border-b border-border',
                )}>
                {/* Ticker-text badge — tinted rounded square */}
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', CLASS_TINT[h.asset_class])} aria-hidden="true">
                  <span className="text-tiny font-bold leading-none tracking-tight">{tickerLabel(h)}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm leading-body-sm font-semibold text-foreground">{h.name}</span>
                  <span className="text-tiny text-muted-foreground">{subtitle}</span>
                </span>
                <span className="shrink-0 text-sm leading-body-sm font-semibold text-foreground">
                  {formatCurrency(h.current_value, h.currency)}
                </span>
              </button>
            )
          })}
        </section>
      ))}
    </div>
  )
}
