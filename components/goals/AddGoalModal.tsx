'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/data-utils'
import { getGoalIcon, getGoalTypeLabel } from '@/lib/goals/calculations'
import { useCreateGoal, CreateGoalInput } from '@/hooks/useGoalsQuery'
import { AccountDB, GoalType } from '@/types/database'

interface AddGoalModalProps {
  account: AccountDB
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const GOAL_TYPES: GoalType[] = [
  'emergency_fund',
  'vacation',
  'house_down_payment',
  'car_purchase',
  'education',
  'wedding',
  'investment',
  'other'
]

export function AddGoalModal({
  account,
  isOpen,
  onClose,
  onSuccess
}: AddGoalModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    goalType: 'other' as GoalType,
    targetAmount: '',
    targetMonth: '',
    targetYear: ''
  })
  const [error, setError] = useState<string | null>(null)

  const createGoal = useCreateGoal(account.id)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        goalType: 'other',
        targetAmount: '',
        targetMonth: '',
        targetYear: ''
      })
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!formData.name.trim()) {
      setError('Please enter a goal name')
      return
    }

    const targetAmount = parseFloat(formData.targetAmount)
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setError('Please enter a valid target amount')
      return
    }

    if (targetAmount <= account.balance) {
      setError('Target must be greater than current balance')
      return
    }

    if (!formData.targetMonth || !formData.targetYear) {
      setError('Please select a target date')
      return
    }

    const targetDate = `${formData.targetMonth}/${formData.targetYear}`

    try {
      const data: CreateGoalInput = {
        name: formData.name.trim(),
        goalType: formData.goalType,
        targetAmount,
        targetDate
      }

      await createGoal.mutateAsync(data)
      onClose()
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      // Error is handled by the mutation hook
    }
  }

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })
  }))

  // Generate year options (current year + 10 years)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i)

  // Preview calculation
  const targetAmount = parseFloat(formData.targetAmount) || 0
  const amountNeeded = Math.max(targetAmount - account.balance, 0)
  const previewProgress = targetAmount > 0
    ? Math.min((account.balance / targetAmount) * 100, 100)
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Financial Goal</DialogTitle>
          <DialogDescription>
            Set a savings goal for {account.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Goal Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              placeholder="e.g., Emergency Fund"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Goal Type */}
          <div className="space-y-2">
            <Label htmlFor="goalType">Goal Type</Label>
            <Select
              value={formData.goalType}
              onValueChange={(value) =>
                setFormData({ ...formData, goalType: value as GoalType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getGoalIcon(type)} {getGoalTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <Label htmlFor="targetAmount">Target Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {account.currency === 'IDR' ? 'Rp' : '$'}
              </span>
              <Input
                id="targetAmount"
                type="number"
                className="pl-10"
                placeholder="30,000,000"
                value={formData.targetAmount}
                onChange={(e) =>
                  setFormData({ ...formData, targetAmount: e.target.value })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Current balance: {formatCurrency(account.balance, account.currency)}
            </p>
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label>Target Date</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={formData.targetMonth}
                onValueChange={(value) =>
                  setFormData({ ...formData, targetMonth: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={formData.targetYear}
                onValueChange={(value) =>
                  setFormData({ ...formData, targetYear: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {targetAmount > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Preview: </span>
                Need to save{' '}
                <span className="font-semibold text-primary">
                  {formatCurrency(amountNeeded, account.currency)}
                </span>{' '}
                more ({previewProgress.toFixed(1)}% complete)
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGoal.isPending}>
              {createGoal.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Create Goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
