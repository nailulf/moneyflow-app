'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import { useGoal } from '@/hooks/useGoalsQuery'
import { GoalCardCompact } from './GoalCardCompact'
import { Button } from '@/components/ui/atoms/button'
import { StickyCtaBar } from '@/components/features/budget/StickyCtaBar'
import { cn } from '@/lib/utils'

interface GoalCreatedViewProps {
  goalId: string
  onViewGoal: () => void
  onBackToAccount: () => void
}

export function GoalCreatedView({
  goalId,
  onViewGoal,
  onBackToAccount,
}: GoalCreatedViewProps) {
  const t = useTranslations('goals')
  const { data } = useGoal(goalId)

  if (!data) {
    return null
  }

  const { goal, account, saved, isCompleted } = data

  return (
    <div className="flex flex-col items-center justify-start px-4 py-8 min-h-screen">
      {/* Success Check Icon */}
      <div className="mb-6">
        <div className={cn('flex h-16 w-16 items-center justify-center rounded-full bg-success/10')}>
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-center text-2xl font-bold leading-title-2 text-foreground mb-2">
        {t('success.title')}
      </h1>

      {/* Subtitle */}
      <p className="text-center text-md leading-body-sm text-muted-foreground mb-6">
        {t('success.subtitle')}
      </p>

      {/* Goal Recap Card */}
      <div className="w-full mb-6">
        <GoalCardCompact
          item={{ goal, saved, isCompleted }}
          currency={account.currency}
        />
      </div>

      {/* Sticky Footer with CTAs */}
      <StickyCtaBar className="flex flex-col gap-3">
        <Button
          onClick={onViewGoal}
          className="h-[52px] rounded-[14px] w-full text-base font-semibold"
          aria-label={t('success.viewGoal')}
        >
          {t('success.viewGoal')}
        </Button>
        <button
          onClick={onBackToAccount}
          className="h-auto px-0 text-base font-medium leading-body-sm text-primary hover:underline underline-offset-4"
          aria-label={t('success.backToAccount')}
        >
          {t('success.backToAccount')}
        </button>
      </StickyCtaBar>
    </div>
  )
}
