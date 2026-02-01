'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Target, Loader2, ChevronRight, TrendingUp, Calendar, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/data-utils'
import { useGoalsSummary } from '@/hooks/useGoalsQuery'
import {
  getGoalIcon,
  isGoalOnTrack,
  getProgressColor,
  getStatusText,
  calculateRequiredSavings,
  formatTargetDate
} from '@/lib/goals/calculations'

export function FinancialGoalsSection() {
  const router = useRouter()
  const { data: summary, isLoading, error } = useGoalsSummary()

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-semibold">Financial Goals</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-semibold">Financial Goals</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">Failed to load financial goals</p>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (!summary || summary.goals.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-semibold">Financial Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Start Your Savings Journey</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Set financial goals for your bank and investment accounts to track your progress towards your dreams.
            </p>
            <Button onClick={() => router.push('/spending/accounts')}>
              <Target className="w-4 h-4 mr-2" />
              Set Your First Goal
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-xl font-semibold">Financial Goals</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Track your progress towards your savings targets
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/spending/accounts')}
        >
          Manage Goals
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wallet className="w-4 h-4" />
              <span>Total Savings</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalSavings)}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Target className="w-4 h-4" />
              <span>Active Goals</span>
            </div>
            <p className="text-2xl font-bold">{summary.activeGoalsCount}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Completed</span>
            </div>
            <p className="text-2xl font-bold text-success">{summary.completedGoalsCount}</p>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {summary.goals.map((goal) => {
            const tracking = isGoalOnTrack(
              goal.currentAmount,
              goal.targetAmount,
              goal.targetDate,
              goal.createdAt
            )
            const required = calculateRequiredSavings(
              goal.currentAmount,
              goal.targetAmount,
              goal.targetDate
            )

            return (
              <div
                key={goal.id}
                className="p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => router.push(`/spending/accounts/${goal.accountId}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getGoalIcon(goal.goalType)}</span>
                    <div>
                      <h4 className="font-semibold">{goal.name}</h4>
                      <p className="text-sm text-muted-foreground">{goal.accountName}</p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      tracking.on_track
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}
                  >
                    {getStatusText(tracking.status)}
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

                {/* Stats Row */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-muted-foreground">Progress: </span>
                      <span className="font-semibold">
                        {formatCurrency(goal.currentAmount, goal.currency)}
                      </span>
                      <span className="text-muted-foreground"> / </span>
                      <span>{formatCurrency(goal.targetAmount, goal.currency)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      ({goal.progressPercentage.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatTargetDate(goal.targetDate)}</span>
                    </div>
                    {required.is_achievable && required.required_monthly > 0 && (
                      <div>
                        <span className="font-medium text-foreground">
                          {formatCurrency(required.required_monthly, goal.currency)}
                        </span>
                        <span>/mo needed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Completed Goals */}
        {summary.completedGoals.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Completed Goals ({summary.completedGoals.length})
            </h4>
            <div className="space-y-2">
              {summary.completedGoals.slice(0, 3).map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span>{getGoalIcon(goal.goalType)}</span>
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-sm text-muted-foreground">({goal.accountName})</span>
                  </div>
                  <div className="text-success font-semibold">
                    {formatCurrency(goal.targetAmount, goal.currency)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
