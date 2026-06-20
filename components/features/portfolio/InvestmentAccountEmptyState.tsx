'use client'

import { useTranslations } from 'next-intl'
import { Layers, Plus, Lightbulb } from 'lucide-react'
import type { AssetClass } from '@/lib/portfolio-utils'
import { cn } from '@/lib/utils'

interface Chip {
  assetClass: AssetClass
  labelKey: 'chipIdx' | 'chipFund' | 'chipEtf' | 'chipBond' | 'chipUs'
  tint: string
}

const CHIPS: Chip[] = [
  { assetClass: 'IDX_STOCK',   labelKey: 'chipIdx',  tint: 'bg-tint-blue-bg   text-tint-blue-fg'   },
  { assetClass: 'MUTUAL_FUND', labelKey: 'chipFund', tint: 'bg-tint-purple-bg text-tint-purple-fg' },
  { assetClass: 'ETF',         labelKey: 'chipEtf',  tint: 'bg-tint-teal-bg   text-tint-teal-fg'   },
  { assetClass: 'BOND',        labelKey: 'chipBond', tint: 'bg-tint-amber-bg  text-tint-amber-fg'  },
  { assetClass: 'US_STOCK',    labelKey: 'chipUs',   tint: 'bg-tint-green-bg  text-tint-green-fg'  },
]

interface InvestmentAccountEmptyStateProps {
  accountName: string
  onAddAsset: (assetClass: AssetClass) => void
}

/**
 * Full-page empty state for an investment account with no holdings (design `STO8m`).
 * Renders a navy hero (Rp 0 + hint), a "No assets yet" card with the Layers icon,
 * 5 tinted asset-class chips, and a tip note.
 */
export function InvestmentAccountEmptyState({ onAddAsset }: InvestmentAccountEmptyStateProps) {
  const t = useTranslations('portfolio.accountEmpty')

  return (
    <div className="flex flex-col gap-5">
      {/* Navy hero */}
      <section className="rounded-[20px] bg-hero-gradient p-5 text-hero-foreground">
        <p className="text-xs leading-caption text-hero-muted">{t('heroLabel')}</p>
        <p className="mt-1 text-3xl font-bold leading-title-2">Rp 0</p>
        <p className="mt-3 border-t border-hero-foreground/10 pt-3 text-tiny leading-caption text-hero-muted">
          {t('heroHint')}
        </p>
      </section>

      {/* No-assets card */}
      <div className="flex flex-col gap-4 rounded-[16px] bg-card p-5 shadow-card">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Layers className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="text-sm leading-body-sm font-bold text-foreground">{t('title')}</p>
          <p className="text-sm leading-body-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Asset-class chips */}
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.assetClass}
              type="button"
              onClick={() => onAddAsset(chip.assetClass)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5',
                'text-sm leading-none font-medium',
                chip.tint,
              )}
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              {t(chip.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Tip note */}
      <div className="flex items-start gap-2 px-1">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-tiny leading-caption text-muted-foreground">{t('tip')}</p>
      </div>
    </div>
  )
}
