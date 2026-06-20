'use client'

import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/data-utils'

interface PortfolioValueHeroProps {
  totalValue: number
  totalGainLoss: number
  totalGainLossPct: number
  assetCount: number
  currency: string
}

/** Navy total-value hero (design `Sj58B`). Gain vs cost is a placeholder until
 *  price-feed integration — shows a localized "Needs price data" note instead. */
export function PortfolioValueHero({ totalValue, totalGainLoss, totalGainLossPct, assetCount, currency }: PortfolioValueHeroProps) {
  const t = useTranslations('portfolio')
  return (
    <section className="rounded-[20px] bg-hero-gradient p-5 text-hero-foreground">
      <p className="text-xs leading-caption text-hero-muted">{t('hero.totalValue')}</p>
      <p className="mt-1 text-3xl font-bold leading-title-2">{formatCurrency(totalValue, currency)}</p>
      <div className="mt-3 flex items-center gap-4 border-t border-hero-foreground/10 pt-3">
        <p className="text-tiny leading-caption text-hero-muted">{t('hero.gainPlaceholder')}</p>
        <span className="ml-auto text-tiny text-hero-muted">{t('hero.assets', { count: assetCount })}</span>
      </div>
    </section>
  )
}
