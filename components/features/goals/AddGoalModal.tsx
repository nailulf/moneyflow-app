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
import { useTranslations, useLocale } from 'next-intl'
import { formatCurrency } from '@/lib/data-utils'
import { getGoalIcon } from '@/lib/goals/calculations'
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
  const t = useTranslations('goalForm')
  const locale = useLocale()
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
      setError(t('errorName'))
      return
    }

    const targetAmount = parseFloat(formData.targetAmount)
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setError(t('errorAmount'))
      return
    }

    if (targetAmount <= account.balance) {
      setError(t('errorBalance'))
      return
    }

    if (!formData.targetMonth || !formData.targetYear) {
      setError(t('errorDate'))
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

  // Generate month options (localized month names)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: new Date(2000, i, 1).toLocaleString(locale, { month: 'long' })
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
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { account: account.name })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Goal Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('nameLabel')}</Label>
            <Input
              id="name"
              placeholder={t('namePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Goal Type */}
          <div className="space-y-2">
            <Label htmlFor="goalType">{t('typeLabel')}</Label>
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
                    {getGoalIcon(type)} {t(`types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <Label htmlFor="targetAmount">{t('amountLabel')}</Label>
            <Input
              id="targetAmount"
              type="amount"
              placeholder={t('amountPlaceholder')}
              value={formData.targetAmount}
              onChange={(e) =>
                setFormData({ ...formData, targetAmount: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('currentBalance', { balance: formatCurrency(account.balance, account.currency) })}
            </p>
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label>{t('dateLabel')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={formData.targetMonth}
                onValueChange={(value) =>
                  setFormData({ ...formData, targetMonth: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('monthPlaceholder')} />
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
                  <SelectValue placeholder={t('yearPlaceholder')} />
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
                <span className="font-medium">{t('previewLabel')} </span>
                {t('previewText', {
                  amount: formatCurrency(amountNeeded, account.currency),
                  pct: previewProgress.toFixed(1),
                })}
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
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={createGoal.isPending}>
              {createGoal.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
