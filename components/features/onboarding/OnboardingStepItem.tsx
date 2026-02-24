'use client'

import { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepStatus = 'pending' | 'current' | 'completed'

interface OnboardingStepItemProps {
  title: string
  description?: string
  status: StepStatus
  stepNumber: number
  children?: ReactNode
  isExpanded?: boolean
}

export function OnboardingStepItem({
  title,
  description,
  status,
  stepNumber,
  children,
  isExpanded = false
}: OnboardingStepItemProps) {
  const t = useTranslations('onboarding.stepItem')
  return (
    <div
      className={cn(
        'border-b border-border last:border-b-0 transition-colors',
        status === 'current' && 'bg-muted/30'
      )}
    >
      {/* Step header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status indicator */}
        <div className="flex-shrink-0">
          {status === 'completed' ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-foreground">
              <Check className="h-4 w-4" />
            </div>
          ) : status === 'current' ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="text-xs font-semibold">{stepNumber}</span>
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/30">
              <span className="text-xs text-muted-foreground">{stepNumber}</span>
            </div>
          )}
        </div>

        {/* Title and description */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              'text-sm font-medium',
              status === 'completed' && 'text-muted-foreground',
              status === 'current' && 'text-foreground',
              status === 'pending' && 'text-muted-foreground'
            )}
          >
            {title}
          </h4>
          {description && status !== 'current' && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0">
          {status === 'completed' && (
            <span className="text-xs text-success font-medium">{t('done')}</span>
          )}
          {status === 'pending' && (
            <span className="text-xs text-muted-foreground">{t('pending')}</span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {status === 'current' && isExpanded && children && (
        <div className="px-4 pb-4">
          <div className="ml-9">{children}</div>
        </div>
      )}
    </div>
  )
}
