'use client'

import { useTranslations, useLocale } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrencyCompact } from '@/lib/data-utils'
import {
  calculateGoalProgress,
  isGoalOnTrack,
  parseTargetDate,
} from '@/lib/goals/calculations'
import type { GoalWithSaved } from '@/lib/goals/waterfall'
import { goalIcon, goalTint } from '@/lib/goals/goal-style'

interface GoalCardProps {
  item: GoalWithSaved
  currency: string
  onClick?: () => void
}

export function GoalCardCompact({ item, currency, onClick }: GoalCardProps) {
  const t = useTranslations('goals')
  const locale = useLocale()
  const { goal, saved } = item

  const target = Number(goal.target_amount)
  const pct = Math.round(calculateGoalProgress(saved, target).progress_percentage)
  const barWidth = Math.min(Math.max(pct, 0), 100)

  const tracking = isGoalOnTrack(saved, target, goal.target_date, goal.created_at)
  const onTrack = tracking.status !== 'behind' && tracking.status !== 'overdue'

  const Icon = goalIcon(goal.goal_type)
  const tint = goalTint(goal.goal_type)

  const targetMonth = parseTargetDate(goal.target_date).toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric',
  })

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl bg-card p-3.5 text-left shadow-card transition-colors hover:bg-muted/30"
    >
      {/* Top row: icon + name/meta + chevron */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            tint.bg,
          )}
        >
          <Icon className={cn('h-5 w-5', tint.fg)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-md font-semibold leading-body-sm text-foreground">
            {goal.name}
          </p>
          <p className="truncate text-xs leading-caption text-muted-foreground">
            {t('card.target', { date: targetMonth })}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>

      {/* Amount row */}
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold leading-title-4 text-foreground">
          {formatCurrencyCompact(saved, currency)}
        </span>
        <span className="text-sm leading-body-sm text-muted-foreground">
          {t('card.ofTarget', { target: formatCurrencyCompact(target, currency) })}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Footer: percent + status */}
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold leading-body-sm text-primary">
          {t('card.tercapai', { pct })}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium leading-body-sm text-foreground">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              onTrack ? 'bg-success' : 'bg-destructive',
            )}
          />
          {onTrack ? t('card.onTrack') : t('card.behind')}
        </span>
      </div>
    </button>
  )
}
