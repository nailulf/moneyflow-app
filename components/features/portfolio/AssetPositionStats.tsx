'use client'

import { useTranslations } from 'next-intl'
import type { HoldingLike } from '@/lib/portfolio-utils'
import { assetPositionView } from '@/lib/portfolio-screen-utils'
import { formatCurrency } from '@/lib/data-utils'

interface AssetPositionStatsProps {
  holding: HoldingLike
}

interface StatRowProps {
  label: string
  value: string
  isPlaceholder?: boolean
}

function StatRow({ label, value, isPlaceholder }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm leading-body-sm text-muted-foreground">{label}</span>
      <span className={isPlaceholder ? 'text-sm leading-body-sm text-muted-foreground italic' : 'text-sm leading-body-sm font-semibold text-foreground'}>
        {value}
      </span>
    </div>
  )
}

/**
 * "Your Holdings" stat card (design: `portfolio.position.*`).
 * Book value model:
 *   - Average Buy Price + Quantity label → real (from assetPositionView)
 *   - Current Price + Unrealized P/L → placeholder ("Needs price data")
 *   - Current Value → current_value from holding
 */
export function AssetPositionStats({ holding }: AssetPositionStatsProps) {
  const t = useTranslations('portfolio')
  const { avgBuyPrice, bookValue, quantityLabel } = assetPositionView(holding)
  const placeholder = t('position.placeholder')

  // Localize the unit in quantityLabel: assetPositionView returns "<qty> lots|units" in English.
  // Split qty and replace the unit word via the i18n key.
  const [qty, rawUnit] = quantityLabel.split(' ')
  const unitKey = rawUnit === 'lots' ? 'unit.lots' : 'unit.units'
  const localizedQuantityLabel = `${qty} ${t(unitKey as Parameters<typeof t>[0])}`

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-card">
      {/* Header row with quantity badge */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <h2 className="text-sm leading-body-sm font-semibold text-foreground">{t('position.title')}</h2>
        <span className="rounded-full bg-selected px-2.5 py-1 text-tiny font-semibold text-selected-foreground">
          {localizedQuantityLabel}
        </span>
      </div>

      {/* Stats rows */}
      <div className="px-4">
        <StatRow label={t('position.avgBuyPrice')} value={formatCurrency(avgBuyPrice, holding.currency)} />
        <StatRow label={t('position.currentPrice')} value={placeholder} isPlaceholder />
        <StatRow label={t('position.currentValue')} value={formatCurrency(bookValue, holding.currency)} />
        <StatRow label={t('position.unrealizedPl')} value={placeholder} isPlaceholder />
      </div>
    </section>
  )
}
