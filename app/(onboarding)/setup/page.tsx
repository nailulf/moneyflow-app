'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { AccountSetupStep } from '@/components/onboarding/AccountSetupStep'
import { CategoriesStep } from '@/components/onboarding/CategoriesStep'
import { BudgetSetupStep } from '@/components/onboarding/BudgetSetupStep'
import { Loader2 } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const { state, loading, needsOnboarding, currentPhase } = useOnboarding()

  // If onboarding is already completed/skipped, redirect to dashboard
  useEffect(() => {
    if (!loading && !needsOnboarding) {
      router.push('/')
    }
  }, [loading, needsOnboarding, router])

  // If user is at welcome phase, redirect to welcome
  useEffect(() => {
    if (!loading && state && state.current_phase === 'welcome') {
      router.push('/welcome')
    }
  }, [loading, state, router])

  // If user completed, redirect to complete
  useEffect(() => {
    if (!loading && state && state.current_phase === 'completed') {
      router.push('/complete')
    }
  }, [loading, state, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Render the appropriate step based on current phase
  const renderStep = () => {
    switch (currentPhase) {
      case 'account_setup':
        return <AccountSetupStep />
      case 'categories':
        return <CategoriesStep />
      case 'budget_setup':
        return <BudgetSetupStep />
      default:
        return null
    }
  }

  // Get step number for progress display
  const getStepNumber = () => {
    switch (currentPhase) {
      case 'account_setup':
        return 1
      case 'categories':
        return 2
      case 'budget_setup':
        return 3
      default:
        return 1
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      <OnboardingProgress
        currentStep={getStepNumber()}
        totalSteps={3}
        className="mb-8"
      />

      {/* Current step content */}
      {renderStep()}
    </div>
  )
}
