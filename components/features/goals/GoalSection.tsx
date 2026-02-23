'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/molecules/card'
import { Button } from '@/components/ui/atoms/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/molecules/alert-dialog'
import { Plus, Edit2, Trash2, Target, Wallet, TrendingUp, Calendar, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/data-utils'
import {
  calculateGoalProgress,
  calculateRequiredSavings,
  isGoalOnTrack,
  getGoalIcon,
  getProgressColor,
  getStatusText,
  formatTargetDate
} from '@/lib/goals/calculations'
import { useAccountGoal, useDeleteGoal } from '@/hooks/useGoalsQuery'
import { AddGoalModal } from './AddGoalModal'
import { EditGoalModal } from './EditGoalModal'
import { AccountDB } from '@/types/database'

interface GoalSectionProps {
  account: AccountDB
}

export function GoalSection({ account }: GoalSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const { data, isLoading } = useAccountGoal(account.id)
  const deleteGoal = useDeleteGoal(account.id)

  const goal = data?.goal
  const canHaveGoal = ['BANK', 'INVESTMENT'].includes(account.type)

  const handleDelete = async () => {
    await deleteGoal.mutateAsync()
    setIsDeleteDialogOpen(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Can't have goals for this account type
  if (!canHaveGoal) {
    return null
  }

  // No goal set - show empty state
  if (!goal) {
    return (
      <>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-2">No Goal Set</h3>
              <p className="text-muted-foreground mb-4">
                Set a financial goal to track your progress with this account
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </CardContent>
        </Card>

        <AddGoalModal
          account={account}
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      </>
    )
  }

  // Goal exists - show progress
  const progress = calculateGoalProgress(account.balance, goal.target_amount)
  const tracking = isGoalOnTrack(
    account.balance,
    goal.target_amount,
    goal.target_date,
    goal.created_at
  )
  const required = calculateRequiredSavings(
    account.balance,
    goal.target_amount,
    goal.target_date
  )

  return (
    <>
      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getGoalIcon(goal.goal_type)}</span>
              <div>
                <h3 className="text-xl font-bold">{goal.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Target: {formatTargetDate(goal.target_date)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{progress.progress_percentage}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressColor(tracking.status)}`}
                style={{ width: `${Math.min(progress.progress_percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Wallet className="w-4 h-4" />
                <span>Current</span>
              </div>
              <p className="font-semibold">
                {formatCurrency(progress.current_amount, account.currency)}
              </p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Target className="w-4 h-4" />
                <span>Target</span>
              </div>
              <p className="font-semibold">
                {formatCurrency(progress.target_amount, account.currency)}
              </p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Remaining</span>
              </div>
              <p className="font-semibold">
                {formatCurrency(progress.amount_remaining, account.currency)}
              </p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Calendar className="w-4 h-4" />
                <span>Required/Month</span>
              </div>
              <p className="font-semibold">
                {formatCurrency(required.required_monthly, account.currency)}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                tracking.on_track
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}
            >
              {getStatusText(tracking.status)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <EditGoalModal
        account={account}
        goal={goal}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Financial Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &ldquo;{goal.name}&rdquo; goal?
              <br /><br />
              Your account balance ({formatCurrency(account.balance, account.currency)}) will
              remain unchanged. Only the goal tracking will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGoal.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Yes, Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
