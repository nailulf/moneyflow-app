'use client'

import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

interface PortfolioValueHeroProps {
  totalValue: number
  totalGainLoss: number
  totalGainLossPct: number
  assetCount: number
  currency: string
}

/** Navy total-value hero (design `Sj58B`). No live day-change — shows gain vs cost. */
export function PortfolioValueHero({ totalValue, totalGainLoss, totalGainLossPct, assetCount, currency }: PortfolioValueHeroProps) {
  const t = useTranslations('portfolio')
  const up = totalGainLoss >= 0
  return (
    <section className="rounded-[20px] bg-hero-gradient p-5 text-hero-foreground">
      <p className="text-xs leading-caption text-hero-muted">{t('hero.totalValue')}</p>
      <p className="mt-1 text-3xl font-bold leading-title-2">{formatCurrency(totalValue, currency)}</p>
      <div className="mt-3 flex items-center gap-4 border-t border-hero-foreground/10 pt-3">
        <p className={cn('text-sm leading-body-sm font-semibold', up ? 'text-hero-success' : 'text-hero-danger')}>
          {up ? '+ ' : '− '}{formatCurrency(Math.abs(totalGainLoss), currency)} ({up ? '+' : ''}{totalGainLossPct}%)
        </p>
        <span className="ml-auto text-tiny text-hero-muted">{t('hero.assets', { count: assetCount })}</span>
      </div>
    </section>
  )
}
