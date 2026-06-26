'use client'
import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'
import type { Insight } from '@/lib/forecast/insights'
import { formatCurrency } from '@/lib/data-utils'

export function ForecastInsightsCard({ insights }: { insights: Insight[] }) {
  const t = useTranslations('forecast')
  if (insights.length === 0) return null

  const render = (ins: Insight): string => {
    switch (ins.code) {
      case 'lowSuccess':
      case 'highSuccess': {
        const targetLabel =
          ins.targetNetWorth > 0
            ? t('insights.targetAbove', { amount: formatCurrency(ins.targetNetWorth) })
            : t('insights.targetPositive')
        return t(`insights.${ins.code}`, { targetLabel })
      }
      case 'negativeCashflowMonths':
        return t('insights.negativeCashflowMonths', { months: ins.months })
      default:
        return t(`insights.${ins.code}`)
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-card p-4 shadow-card">
      {insights.map((ins, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-foreground">{render(ins)}</p>
        </div>
      ))}
    </div>
  )
}
