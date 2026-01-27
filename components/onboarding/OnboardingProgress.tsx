'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
  className?: string
}

const STEP_LABELS = ['Account', 'Categories', 'Budget']

export function OnboardingProgress({
  currentStep,
  totalSteps,
  className
}: OnboardingProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep
          const isPending = step > currentStep

          return (
            <div key={step} className="flex items-center flex-1">
              {/* Step circle */}
              <div className="flex items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium transition-colors',
                    isCompleted && 'border-primary bg-primary text-primary-foreground',
                    isCurrent && 'border-primary bg-white text-primary',
                    isPending && 'border-muted bg-muted/50 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{step}</span>
                  )}
                </div>

                {/* Step label - visible on larger screens */}
                <span
                  className={cn(
                    'ml-3 hidden sm:block text-sm font-medium',
                    isCurrent && 'text-primary',
                    !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {STEP_LABELS[step - 1]}
                </span>
              </div>

              {/* Connector line */}
              {step < totalSteps && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4',
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile step label */}
      <p className="text-center text-sm text-muted-foreground sm:hidden">
        Step {currentStep} of {totalSteps}: {STEP_LABELS[currentStep - 1]}
      </p>
    </div>
  )
}
