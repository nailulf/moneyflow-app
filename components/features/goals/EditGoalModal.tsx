'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/molecules/dialog'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/molecules/select'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/data-utils'
import { formatTargetDate } from '@/lib/goals/calculations'
import { useUpdateGoal, UpdateGoalInput } from '@/hooks/useGoalsQuery'
import { AccountDB, FinancialGoalDB } from '@/types/database'

interface EditGoalModalProps {
  account: AccountDB
  goal: FinancialGoalDB
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function EditGoalModal({
  account,
  goal,
  isOpen,
  onClose,
  onSuccess
}: EditGoalModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    targetMonth: '',
    targetYear: ''
  })
  const [error, setError] = useState<string | null>(null)

  const updateGoal = useUpdateGoal(goal.id)

  // Initialize form with goal data
  useEffect(() => {
    if (isOpen && goal) {
      const formattedDate = formatTargetDate(goal.target_date)
      const [month, year] = formattedDate.split('/')

      setFormData({
        name: goal.name,
        targetAmount: goal.target_amount.toString(),
        targetMonth: month,
        targetYear: year
      })
      setError(null)
    }
  }, [isOpen, goal])

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

    if (!formData.targetMonth || !formData.targetYear) {
      setError('Please select a target date')
      return
    }

    const targetDate = `${formData.targetMonth}/${formData.targetYear}`

    try {
      const data: UpdateGoalInput = {
        name: formData.name.trim(),
        targetAmount,
        targetDate
      }

      await updateGoal.mutateAsync(data)
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
  const previewProgress = targetAmount > 0
    ? Math.min((account.balance / targetAmount) * 100, 100)
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Financial Goal</DialogTitle>
          <DialogDescription>
            Update your savings goal for {account.name}
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

          {/* Target Amount */}
          <div className="space-y-2">
            <Label htmlFor="targetAmount">Target Amount</Label>
            <Input
              id="targetAmount"
              type="amount"
              placeholder="30,000,000"
              value={formData.targetAmount}
              onChange={(e) =>
                setFormData({ ...formData, targetAmount: e.target.value })
              }
            />
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
                <span className="font-medium">Progress: </span>
                {formatCurrency(account.balance, account.currency)} of{' '}
                {formatCurrency(targetAmount, account.currency)}{' '}
                ({previewProgress.toFixed(1)}%)
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
            <Button type="submit" disabled={updateGoal.isPending}>
              {updateGoal.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
