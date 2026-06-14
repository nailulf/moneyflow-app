'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import { Button } from '@/components/ui/atoms/button'
import { Target, Loader2, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/data-utils'
import { useGoalsSummary } from '@/hooks/useGoalsQuery'
import { GoalCard } from './GoalCard'

export function SavingPlansWidget() {
  const router = useRouter()
  const { data: summary, isLoading, error } = useGoalsSummary()

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Saving Plans</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Saving Plans</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground text-sm">Failed to load saving plans</p>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (!summary || summary.goals.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Saving Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-2">No Saving Plans Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Set financial goals for your accounts to track your progress
            </p>
            <Button onClick={() => router.push('/spending/accounts')}>
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Saving Plans</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.push('/spending/accounts')}
        >
          View All
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Total Savings */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Total Savings</p>
          <p className="text-2xl font-bold">
            {formatCurrency(summary.totalSavings)}
          </p>
        </div>

        {/* Goals List */}
        <div className="space-y-3">
          {summary.goals.slice(0, 3).map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>

        {/* Show more indicator */}
        {summary.goals.length > 3 && (
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/spending/accounts')}
            >
              +{summary.goals.length - 3} more goals
            </Button>
          </div>
        )}

        {/* Completed goals summary */}
        {summary.completedGoalsCount > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {summary.completedGoalsCount} goal{summary.completedGoalsCount > 1 ? 's' : ''} completed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
