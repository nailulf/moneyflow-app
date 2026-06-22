'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { formatCurrencyCompact } from '@/lib/data-utils'
import { calculateGoalProgress, isGoalOnTrack } from '@/lib/goals/calculations'
import type { GoalWithSaved } from '@/lib/goals/waterfall'
import { goalIcon, goalTint } from '@/lib/goals/goal-style'

interface GoalCardProps {
  item: GoalWithSaved
  currency: string
  onClick?: () => void
}

export function GoalCardMini({ item, currency, onClick }: GoalCardProps) {
  const t = useTranslations('goals')
  const { goal, saved } = item

  const target = Number(goal.target_amount)
  const pct = Math.round(calculateGoalProgress(saved, target).progress_percentage)
  const barWidth = Math.min(Math.max(pct, 0), 100)

  const tracking = isGoalOnTrack(saved, target, goal.target_date, goal.created_at)
  const onTrack = tracking.status !== 'behind' && tracking.status !== 'overdue'

  const Icon = goalIcon(goal.goal_type)
  const tint = goalTint(goal.goal_type)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[150px] shrink-0 flex-col rounded-2xl bg-card p-3.5 text-left shadow-card transition-colors hover:bg-muted/30"
    >
      {/* Top row: icon + percent */}
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            tint.bg,
          )}
        >
          <Icon className={cn('h-[18px] w-[18px]', tint.fg)} />
        </div>
        <span className="text-sm font-semibold leading-body-sm text-primary">
          {pct}%
        </span>
      </div>

      {/* Name */}
      <p className="mt-3 truncate text-md font-semibold leading-body-sm text-foreground">
        {goal.name}
      </p>

      {/* Amount */}
      <div className="mt-1 flex items-baseline gap-1">
        <span className="truncate text-xl font-bold leading-title-5 text-foreground">
          {formatCurrencyCompact(saved, currency)}
        </span>
        <span className="shrink-0 text-xs leading-caption text-muted-foreground">
          / {formatCurrencyCompact(target, currency)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Status */}
      <span className="mt-2.5 flex items-center gap-1.5 text-xs font-medium leading-caption text-foreground">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            onTrack ? 'bg-success' : 'bg-destructive',
          )}
        />
        {onTrack ? t('card.onTrack') : t('card.behind')}
      </span>
    </button>
  )
}
