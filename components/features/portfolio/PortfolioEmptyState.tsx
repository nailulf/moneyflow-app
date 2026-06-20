'use client'

import { useTranslations } from 'next-intl'
import { PieChart, Landmark, Layers, BarChart2, Plus, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PortfolioEmptyStateProps {
  onAddAccount: () => void
}

const steps = [
  {
    icon: Landmark,
    titleKey: 'step1Title' as const,
    subKey: 'step1Sub' as const,
    tint: 'tint-blue',
  },
  {
    icon: Layers,
    titleKey: 'step2Title' as const,
    subKey: 'step2Sub' as const,
    tint: 'tint-violet',
  },
  {
    icon: BarChart2,
    titleKey: 'step3Title' as const,
    subKey: 'step3Sub' as const,
    tint: 'tint-green',
  },
]

export function PortfolioEmptyState({ onAddAccount }: PortfolioEmptyStateProps) {
  const t = useTranslations('portfolio.empty')

  return (
    <div className="flex flex-col gap-4">
      {/* Hero card */}
      <div className="rounded-2xl bg-card shadow-card px-5 pt-8 pb-6 flex flex-col items-center gap-3">
        {/* Pie chart icon in tint circle */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tint-blue-bg">
          <PieChart className="h-8 w-8 text-tint-blue-fg" aria-hidden="true" />
        </div>

        {/* Headline + subtitle */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="text-xl leading-title-4 font-bold text-foreground">
            {t('title')}
          </h2>
          <p className="text-sm leading-body-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* 3-step list card */}
      <div className="rounded-2xl bg-card shadow-card divide-y divide-border">
        {steps.map(({ icon: Icon, titleKey, subKey, tint }, idx) => (
          <div key={titleKey} className="flex items-center gap-3 px-4 py-4">
            {/* Number badge */}
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                'bg-primary text-primary-foreground text-nano font-bold leading-none'
              )}
            >
              {idx + 1}
            </span>

            {/* Tinted icon circle */}
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                `bg-${tint}-bg`
              )}
            >
              <Icon className={cn('h-5 w-5', `text-${tint}-fg`)} aria-hidden="true" />
            </div>

            {/* Text */}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm leading-body-sm font-semibold text-foreground">
                {t(titleKey)}
              </span>
              <span className="text-tiny leading-caption text-muted-foreground">
                {t(subKey)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={onAddAccount}
        className={cn(
          'flex h-[52px] w-full items-center justify-center gap-2',
          'rounded-[14px] bg-primary text-primary-foreground',
          'text-md leading-none font-semibold',
          'transition-transform active:scale-[0.98]'
        )}
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        {t('addCta')}
      </button>

      {/* Text link */}
      <button
        type="button"
        className="flex items-center justify-center gap-1 text-sm leading-body-sm text-primary"
      >
        {t('basicsLink')}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
