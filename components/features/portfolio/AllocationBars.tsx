'use client'

import { useTranslations } from 'next-intl'
import type { AllocationSlice } from '@/lib/portfolio-utils'

interface AllocationBarsProps {
  slices: AllocationSlice[]
}

/** Per-asset-class allocation bars (design `Sj58B`). */
export function AllocationBars({ slices }: AllocationBarsProps) {
  const t = useTranslations('portfolio')
  if (slices.length === 0) return null
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card">
      <h2 className="text-sm leading-body-sm font-bold text-foreground">{t('allocation.title')}</h2>
      <div className="flex flex-col gap-2.5">
        {slices.map((s) => (
          <div key={s.assetClass} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs leading-caption">
              <span className="text-foreground">{t(`class.${s.assetClass}`)}</span>
              <span className="font-semibold text-muted-foreground">{s.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-muted">
              <div className="h-full rounded-sm bg-primary" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
