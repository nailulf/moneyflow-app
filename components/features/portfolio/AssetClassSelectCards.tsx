'use client'

import { createElement } from 'react'
import { useTranslations } from 'next-intl'
import { LineChart, TrendingUp, PieChart, Landmark, Coins, CircleDollarSign, type LucideIcon } from 'lucide-react'
import type { AssetClass } from '@/lib/portfolio-utils'
import { cn } from '@/lib/utils'

const CLASSES: Array<{ value: AssetClass; icon: LucideIcon; tint: string }> = [
  { value: 'IDX_STOCK', icon: LineChart, tint: 'bg-tint-blue-bg text-tint-blue-fg' },
  { value: 'US_STOCK', icon: TrendingUp, tint: 'bg-tint-green-bg text-tint-green-fg' },
  { value: 'MUTUAL_FUND', icon: PieChart, tint: 'bg-tint-purple-bg text-tint-purple-fg' },
  { value: 'ETF', icon: Landmark, tint: 'bg-tint-teal-bg text-tint-teal-fg' },
  { value: 'BOND', icon: Coins, tint: 'bg-tint-amber-bg text-tint-amber-fg' },
  { value: 'OTHER', icon: CircleDollarSign, tint: 'bg-tint-slate-bg text-tint-slate-fg' },
]

interface AssetClassSelectCardsProps {
  onSelect: (assetClass: AssetClass) => void
}

/** Asset-class picker grid (design `gR1uh`). */
export function AssetClassSelectCards({ onSelect }: AssetClassSelectCardsProps) {
  const t = useTranslations('portfolio')
  return (
    <div className="grid grid-cols-2 gap-3">
      {CLASSES.map((c) => (
        <button key={c.value} type="button" onClick={() => onSelect(c.value)}
          className="flex flex-col gap-2.5 rounded-2xl bg-card p-4 text-left shadow-card transition-colors hover:bg-muted/50">
          <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', c.tint)} aria-hidden="true">
            {createElement(c.icon, { className: 'h-5 w-5' })}
          </span>
          <span className="text-sm leading-body-sm font-bold text-foreground">{t(`class.${c.value}`)}</span>
          <span className="text-tiny text-muted-foreground">{t(`classHint.${c.value}`)}</span>
        </button>
      ))}
    </div>
  )
}
