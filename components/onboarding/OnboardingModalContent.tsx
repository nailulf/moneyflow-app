'use client'

import { useOnboarding } from '@/contexts/OnboardingContext'
import { OnboardingProgressCircle } from './OnboardingProgressCircle'
import { OnboardingStepItem, StepStatus } from './OnboardingStepItem'
import { AccountSetupStepModal } from './AccountSetupStepModal'
import { CategoriesStepModal } from './CategoriesStepModal'
import { BudgetSetupStepModal } from './BudgetSetupStepModal'
import { CompletionView } from './CompletionView'
import { Button } from '@/components/ui/button'
import type { OnboardingPhase } from '@/types/database'

const ONBOARDING_STEPS = [
  {
    id: 'account_setup',
    phase: 'account_setup' as OnboardingPhase,
    title: 'Create your first account',
    description: 'Set up a bank account, credit card, or e-wallet',
    stepNumber: 1
  },
  {
    id: 'categories',
    phase: 'categories' as OnboardingPhase,
    title: 'Review your categories',
    description: 'We\'ve set up default categories for you',
    stepNumber: 2
  },
  {
    id: 'budget_setup',
    phase: 'budget_setup' as OnboardingPhase,
    title: 'Set up your budget',
    description: 'Create a spending plan for the month',
    stepNumber: 3
  }
]

const PHASE_ORDER: OnboardingPhase[] = ['welcome', 'account_setup', 'categories', 'budget_setup', 'completed']

function getStepStatus(stepPhase: OnboardingPhase, currentPhase: OnboardingPhase): StepStatus {
  const stepIndex = PHASE_ORDER.indexOf(stepPhase)
  const currentIndex = PHASE_ORDER.indexOf(currentPhase)

  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}

function getCompletedStepsCount(currentPhase: OnboardingPhase): number {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase)
  return Math.max(0, currentIndex - 1)
}

export function OnboardingModalContent() {
  const { currentPhase, skip, closeModal, loading } = useOnboarding()

  const handleSkipSetup = async () => {
    await skip('Skipped from onboarding modal')
    closeModal()
  }

  if (currentPhase === 'completed') {
    return <CompletionView />
  }

  const displayPhase = currentPhase === 'welcome' ? 'account_setup' : currentPhase
  const completedCount = currentPhase === 'welcome' ? 0 : getCompletedStepsCount(currentPhase!)
  const totalSteps = ONBOARDING_STEPS.length

  return (
    <div className="flex flex-col max-h-[80vh]">
      {/* Header with progress */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <OnboardingProgressCircle
          current={completedCount}
          total={totalSteps}
          size={56}
        />
        <div>
          <h2 className="text-lg font-semibold">Complete your setup</h2>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {totalSteps} complete
          </p>
        </div>
      </div>

      {/* Steps list with content */}
      <div className="flex-1 overflow-y-auto py-2">
        {ONBOARDING_STEPS.map((step) => {
          const status = getStepStatus(step.phase, displayPhase!)
          const isCurrent = status === 'current'

          return (
            <OnboardingStepItem
              key={step.id}
              title={step.title}
              description={step.description}
              status={status}
              stepNumber={step.stepNumber}
              isExpanded={isCurrent}
            >
              {isCurrent && step.phase === 'account_setup' && <AccountSetupStepModal />}
              {isCurrent && step.phase === 'categories' && <CategoriesStepModal />}
              {isCurrent && step.phase === 'budget_setup' && <BudgetSetupStepModal />}
            </OnboardingStepItem>
          )
        })}
      </div>

      {/* Footer with skip option */}
      <div className="pt-4 border-t">
        <Button
          variant="ghost"
          onClick={handleSkipSetup}
          disabled={loading}
          className="w-full text-muted-foreground"
        >
          Skip setup for now
        </Button>
      </div>
    </div>
  )
}
