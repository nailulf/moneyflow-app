'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import { Button } from '@/components/ui/atoms/button'
import { Target, Loader2, ChevronRight, TrendingUp, Plus } from 'lucide-react'
import { useGoalsSummary } from '@/hooks/useGoalsQuery'
import { GoalCard } from './GoalCard'

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
            <Button onClick={() => router.push('/accounts')}>
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
          <p className="text-sm text-muted-foreground mt-1 hidden sm:block leading-tight">
            Track progress towards
            <br className="hidden sm:inline" />
            your savings targets
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/accounts')}
          className="hidden sm:flex"
        >
          Manage Goals
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/accounts')}
          className="sm:hidden"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center text-muted-foreground text-sm mb-1">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Goals</span>
              </div>
              <p className="text-2xl font-bold sm:justify-self-end">{summary.activeGoalsCount}</p>
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center text-muted-foreground text-sm mb-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Completed</span>
              </div>
              <p className="text-2xl font-bold sm:justify-self-end">{summary.completedGoalsCount}</p>
            </div>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {summary.goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
