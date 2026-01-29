'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { WelcomeScreen } from '@/components/onboarding'

export default function WelcomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { skip } = useOnboarding()

  const handleStart = () => {
    router.push('/setup')
  }

  const handleSkip = async () => {
    await skip('user_skipped_welcome')
    router.push('/')
  }

  return (
    <WelcomeScreen
      userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
      onStart={handleStart}
      onSkip={handleSkip}
    />
  )
}
