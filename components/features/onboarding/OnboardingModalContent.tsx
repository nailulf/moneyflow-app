'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import { Analytics } from '@/lib/analytics/amplitude'
import { WelcomeScreen } from './WelcomeScreen'
import { AccountSetupStepModal } from './AccountSetupStepModal'
import { CategoriesStepModal } from './CategoriesStepModal'
import { BudgetSetupStepModal } from './BudgetSetupStepModal'
import { CompletionView } from './CompletionView'
import { cn } from '@/lib/utils'
import type { OnboardingPhase } from '@/types/database'

// Ordered phases that participate in the progress-dot header.
// welcome + completed are rendered as full-screen views without the shell.
const STEP_PHASES: OnboardingPhase[] = ['account_setup', 'categories', 'budget_setup']

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

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return <WelcomeScreen userName={userName} onStart={handleStart} onSkip={handleSkip} />
}

export function OnboardingModalContent() {
  const t = useTranslations('onboarding')
  const { currentPhase } = useOnboarding()

  // Welcome phase — full welcome view, no shell decoration
  if (currentPhase === 'welcome' || currentPhase === null) {
    return <WelcomeView />
  }

  // Completion phase — full completion view, no shell decoration
  if (currentPhase === 'completed') {
    return <CompletionView />
  }

  const stepIndex = STEP_PHASES.indexOf(currentPhase as OnboardingPhase)
  // totalSteps includes the completion marker so the "X of 4" copy matches
  // the dashboard banner-card count (welcome → account → categories → budget → done).
  const totalSteps = STEP_PHASES.length + 1
  const currentStepNumber = stepIndex + 1

  const phaseToKey = (phase: OnboardingPhase) =>
    phase === 'account_setup'
      ? 'accountSetup'
      : phase === 'budget_setup'
        ? 'budgetSetup'
        : 'categories'

  const stepKey = phaseToKey(currentPhase as OnboardingPhase)
  const stepTitle = t(`steps.${stepKey}.title`)
  const stepDescription = t(`steps.${stepKey}.description`)

  return (
    // Fill the parent DialogContent so every step renders at the same height.
    // The Dialog has `overflow-hidden` and a fixed sm:h-[85svh], so this
    // wrapper just needs to span the full available area and let the body
    // scroll internally.
    <div className="flex flex-col h-full min-h-0">
      {/* Header — dot progress + step label. No back button here because each
          step component owns its own back/continue CTAs in the footer. */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                i < currentStepNumber ? 'bg-primary' : 'bg-border'
              )}
              aria-hidden
            />
          ))}
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          {t('modal.stepOf', { current: currentStepNumber, total: totalSteps })}
        </p>
      </div>

      {/* Title + subtitle — replaces the accordion step list */}
      <div className="pt-4 pb-3">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{stepTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{stepDescription}</p>
      </div>

      {/* Active step content — each step is a flex column that owns its own
          scrollable body + pinned footer, so the CTAs always sit at the
          bottom of the dialog regardless of content length. */}
      <div className="flex-1 min-h-0 flex flex-col">
        {currentPhase === 'account_setup' && <AccountSetupStepModal />}
        {currentPhase === 'categories' && <CategoriesStepModal />}
        {currentPhase === 'budget_setup' && <BudgetSetupStepModal />}
      </div>
    </div>
  )
}
