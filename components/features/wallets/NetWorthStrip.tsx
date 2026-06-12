'use client'

import { useTranslations } from 'next-intl'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'

interface NetWorthStripProps {
  netWorth: number
  assetsTotal: number
  liabilitiesTotal: number
  currency: string
}

/** Compact navy net-worth strip (design `JMxTg`). */
export function NetWorthStrip({ netWorth, assetsTotal, liabilitiesTotal, currency }: NetWorthStripProps) {
  const t = useTranslations('wallets')
  return (
    <section className="rounded-2xl bg-hero-gradient p-4 text-hero-foreground">
      <p className="text-xs leading-caption text-hero-muted">{t('netWorth.label')}</p>
      <p className="mt-1 text-2xl font-bold leading-title-4">{formatCurrency(netWorth, currency)}</p>
      <div className="mt-2.5 flex items-center gap-4 border-t border-hero-foreground/10 pt-2">
        <div className="min-w-0">
          <p className="text-tiny text-hero-muted">{t('netWorth.assets')}</p>
          <p className="truncate text-sm leading-body-sm font-semibold text-hero-success">
            {formatCurrencyCompact(assetsTotal, currency)}
          </p>
        </div>
        <div className="h-6 w-px bg-hero-foreground/20" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-tiny text-hero-muted">{t('netWorth.liabilities')}</p>
          <p className="truncate text-sm leading-body-sm font-semibold text-hero-danger">
            {formatCurrencyCompact(liabilitiesTotal, currency)}
          </p>
        </div>
      </div>
    </section>
  )
}
