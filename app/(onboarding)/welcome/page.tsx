'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen'
import { Loader2 } from 'lucide-react'

export default function WelcomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { state, loading, needsOnboarding, goToPhase, skip } = useOnboarding()

  // If onboarding is already completed/skipped, redirect to dashboard
  useEffect(() => {
    if (!loading && !needsOnboarding) {
      router.push('/')
    }
  }, [loading, needsOnboarding, router])

  // If user is past welcome phase, redirect to setup
  useEffect(() => {
    if (!loading && state && state.current_phase !== 'welcome') {
      router.push('/setup')
    }
  }, [loading, state, router])

  const handleStart = async () => {
    await goToPhase('account_setup')
    router.push('/setup')
  }

  const handleSkip = async () => {
    await skip('Skipped from welcome screen')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Get user's name from profile or email
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  return (
    <WelcomeScreen
      userName={userName}
      onStart={handleStart}
      onSkip={handleSkip}
    />
  )
}
