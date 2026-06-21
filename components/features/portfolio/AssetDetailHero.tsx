'use client'

import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/data-utils'

interface AssetDetailHeroProps {
  /** Book value (current_value on the holding). */
  bookValue: number
  currency: string
}

/**
 * Navy hero for the asset-detail screen.
 * Mirrors `PortfolioValueHero` in style but shows the individual holding's
 * book value with a placeholder gain pill (price feed is SP3).
 */
export function AssetDetailHero({ bookValue, currency }: AssetDetailHeroProps) {
  const t = useTranslations('portfolio')
  return (
    <section className="rounded-[20px] bg-hero-gradient p-5 text-hero-foreground">
      <p className="text-xs leading-caption text-hero-muted">{t('position.currentValue')}</p>
      <p className="mt-1 text-3xl font-bold leading-title-2">{formatCurrency(bookValue, currency)}</p>
      <div className="mt-3 flex items-center gap-4 border-t border-hero-foreground/10 pt-3">
        <p className="text-tiny leading-caption text-hero-muted">{t('position.placeholder')}</p>
        <span className="ml-auto rounded-full border border-hero-foreground/20 px-2.5 py-0.5 text-tiny text-hero-muted">
          {t('hero.gainPlaceholder')}
        </span>
      </div>
    </section>
  )
}
