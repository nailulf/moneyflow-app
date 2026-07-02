'use client'

import { createElement } from 'react'
import { useLocale, useTranslations } from 'next-intl'
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

/** Horizontal-scroll mini goal card (design `O3m7TF`: w160 · r16 · p14 · gap8). */
export function GoalCardMini({ item, currency, onClick }: GoalCardProps) {
  const t = useTranslations('goals')
  const locale = useLocale()
  const { goal, saved } = item

  const target = Number(goal.target_amount)
  const pct = Math.round(calculateGoalProgress(saved, target).progress_percentage)
  const barWidth = Math.min(Math.max(pct, 0), 100)

  const tracking = isGoalOnTrack(saved, target, goal.target_date, goal.created_at)
  const onTrack = tracking.status !== 'behind' && tracking.status !== 'overdue'

  const tint = goalTint(goal.goal_type)
  const targetLabel = new Date(goal.target_date).toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric',
  })

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[160px] shrink-0 flex-col gap-2 rounded-2xl bg-card p-3.5 text-left shadow-card transition-colors hover:bg-muted/30"
    >
      {/* Top row: icon + percent */}
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]',
            tint.bg,
          )}
        >
          {createElement(goalIcon(goal.goal_type), { className: cn('h-4 w-4', tint.fg), 'aria-hidden': true })}
        </div>
        <span className="text-xs font-bold leading-caption text-primary">
          {pct}%
        </span>
      </div>

      {/* Name + target date */}
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm font-semibold leading-body-sm text-foreground">
          {goal.name}
        </p>
        <p className="text-nano leading-caption text-muted-foreground">
          {targetLabel}
        </p>
      </div>

      {/* Amount */}
      <div className="flex min-w-0 items-baseline gap-1">
        <span className="truncate text-md font-bold leading-body-sm text-foreground">
          {formatCurrencyCompact(saved, currency)}
        </span>
        <span className="shrink-0 text-tiny leading-caption text-muted-foreground">
          / {formatCurrencyCompact(target, currency)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Status */}
      <span
        className={cn(
          'flex items-center gap-1.5 text-nano font-semibold leading-caption',
          onTrack ? 'text-success' : 'text-destructive',
        )}
      >
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
