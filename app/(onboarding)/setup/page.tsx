'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { 
  AccountSetupStep, 
  CategoriesStep, 
  BudgetSetupStep,
  OnboardingProgress 
} from '@/components/features/onboarding'
import { Loader2 } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const { currentPhase, loading, needsOnboarding } = useOnboarding()

  useEffect(() => {
    if (!loading && !needsOnboarding) {
      router.replace('/')
    }
  }, [loading, needsOnboarding, router])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <OnboardingProgress 
        currentStep={
          currentPhase === 'account_setup' ? 1 :
          currentPhase === 'categories' ? 2 :
          currentPhase === 'budget_setup' ? 3 : 1
        } 
        totalSteps={3} 
      />
      {renderStep()}
    </div>
  )
}
