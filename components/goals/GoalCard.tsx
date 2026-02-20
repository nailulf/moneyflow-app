'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/molecules/card'
import { formatCurrency } from '@/lib/data-utils'
import {
  getGoalIcon,
  isGoalOnTrack,
  getProgressColor
} from '@/lib/goals/calculations'
import { GoalSummaryItem } from '@/hooks/useGoalsQuery'

interface GoalCardProps {
  goal: GoalSummaryItem
  onClick?: () => void
}

export function GoalCard({ goal, onClick }: GoalCardProps) {
  const router = useRouter()

  const tracking = isGoalOnTrack(
    goal.currentAmount,
    goal.targetAmount,
    goal.targetDate,
    goal.createdAt
  )

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(`/accounts/${goal.accountId}`)
    }
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getGoalIcon(goal.goalType)}</span>
            <h3 className="font-semibold text-foreground">{goal.name}</h3>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor(tracking.status)}`}
              style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-foreground">
              {formatCurrency(goal.currentAmount, goal.currency)}
            </span>
            <span className="text-muted-foreground ml-1">
              {goal.progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground text-xs">Target</div>
            <div className="font-medium text-foreground">
              {formatCurrency(goal.targetAmount, goal.currency)}
            </div>
          </div>
        </div>

        {/* Account Name */}
        <div className="mt-2 text-xs text-muted-foreground">
          {goal.accountName}
        </div>
      </CardContent>
    </Card>
  )
}
