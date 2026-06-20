'use client'

import { useTranslations } from 'next-intl'
import { ChartLine, HandCoins, Scale, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsightCardProps {
  icon: React.ReactNode
  iconBg: string
  label: string
  placeholder: string
}

function InsightCard({ icon, iconBg, label, placeholder }: InsightCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-2xl bg-card p-3 shadow-card">
      {/* top row: icon circle + chevron */}
      <div className="flex items-center justify-between">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-[9px]', iconBg)}>
          {icon}
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      {/* label */}
      <p className="text-xs font-semibold leading-caption text-foreground">{label}</p>
      {/* placeholder value */}
      <p className="text-nano font-semibold leading-caption text-muted-foreground">{placeholder}</p>
    </div>
  )
}

/** Row of 3 placeholder insight cards (Performance / Income / Health).
 *  No live data — placeholders until price-feed integration (Task 2). */
export function AccountInsightCards() {
  const t = useTranslations('portfolio.insights')

  return (
    <div className="flex gap-2.5">
      <InsightCard
        icon={<ChartLine className="h-3.5 w-3.5 text-primary" />}
        iconBg="bg-tint-blue-bg"
        label={t('performance')}
        placeholder={t('placeholder')}
      />
      <InsightCard
        icon={<HandCoins className="h-3.5 w-3.5 text-success" />}
        iconBg="bg-tint-green-bg"
        label={t('income')}
        placeholder={t('placeholder')}
      />
      <InsightCard
        icon={<Scale className="h-3.5 w-3.5 text-tint-amber-fg" />}
        iconBg="bg-tint-amber-bg"
        label={t('health')}
        placeholder={t('placeholder')}
      />
    </div>
  )
}
