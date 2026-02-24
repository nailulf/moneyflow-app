'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import { Analytics } from '@/lib/analytics/amplitude'
import { OnboardingProgressCircle } from './OnboardingProgressCircle'
import { OnboardingStepItem, StepStatus } from './OnboardingStepItem'
import { WelcomeScreen } from './WelcomeScreen'
import { AccountSetupStepModal } from './AccountSetupStepModal'
import { CategoriesStepModal } from './CategoriesStepModal'
import { BudgetSetupStepModal } from './BudgetSetupStepModal'
import { CompletionView } from './CompletionView'
import { Button } from '@/components/ui/atoms/button'
import type { OnboardingPhase } from '@/types/database'

const ONBOARDING_STEP_DEFS = [
  { id: 'account_setup', phase: 'account_setup' as OnboardingPhase, stepNumber: 1 },
  { id: 'categories',    phase: 'categories'    as OnboardingPhase, stepNumber: 2 },
  { id: 'budget_setup',  phase: 'budget_setup'  as OnboardingPhase, stepNumber: 3 },
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

function WelcomeView() {
  const { user } = useAuth()
  const { nextPhase, skip, closeModal } = useOnboarding()

  useEffect(() => {
    Analytics.track('onboarding_welcome_viewed', {
      phase: 'welcome',
      timestamp: new Date().toISOString()
    })
  }, [])

  const handleStart = async () => {
    await nextPhase()
  }

  const handleSkip = async () => {
    await skip('Skipped from welcome screen')
    closeModal()
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  return <WelcomeScreen userName={userName} onStart={handleStart} onSkip={handleSkip} />
}

export function OnboardingModalContent() {
  const t = useTranslations('onboarding')
  const { currentPhase, skip, closeModal, loading } = useOnboarding()

  const handleSkipSetup = async () => {
    await skip('Skipped from onboarding modal')
    closeModal()
  }

  // Welcome phase — show full welcome screen inside the modal
  if (currentPhase === 'welcome' || currentPhase === null) {
    return <WelcomeView />
  }

  if (currentPhase === 'completed') {
    return <CompletionView />
  }

  const completedCount = getCompletedStepsCount(currentPhase)
  const totalSteps = ONBOARDING_STEP_DEFS.length

  const onboardingSteps = ONBOARDING_STEP_DEFS.map(def => ({
    ...def,
    title: t(`steps.${def.id === 'account_setup' ? 'accountSetup' : def.id === 'budget_setup' ? 'budgetSetup' : 'categories'}.title`),
    description: t(`steps.${def.id === 'account_setup' ? 'accountSetup' : def.id === 'budget_setup' ? 'budgetSetup' : 'categories'}.description`),
  }))

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
          <h2 className="text-lg font-semibold">{t('modal.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('modal.progress', { completed: completedCount, total: totalSteps })}
          </p>
        </div>
      </div>

      {/* Steps list with content */}
      <div className="flex-1 overflow-y-auto py-2">
        {onboardingSteps.map((step) => {
          const status = getStepStatus(step.phase, currentPhase)
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
          {t('modal.skipSetup')}
        </Button>
      </div>
    </div>
  )
}
