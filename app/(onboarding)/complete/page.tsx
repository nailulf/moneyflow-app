'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { CompletionScreen } from '@/components/onboarding/CompletionScreen'
import { Loader2 } from 'lucide-react'

export default function CompletePage() {
  const router = useRouter()
  const { state, loading, complete } = useOnboarding()
  const [summary, setSummary] = useState<{
    accountsCreated: number
    categoriesCount: number
    budgetsCreated: number
    durationSeconds: number
  } | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  // Complete onboarding when reaching this page
  useEffect(() => {
    async function completeOnboarding() {
      if (!loading && state && !state.is_completed && !isCompleting) {
        setIsCompleting(true)
        try {
          const result = await complete()
          setSummary(result)
        } catch (error) {
          console.error('Error completing onboarding:', error)
          // Still show completion screen even if API fails
          setSummary({
            accountsCreated: 0,
            categoriesCount: 13,
            budgetsCreated: 0,
            durationSeconds: 0
          })
        } finally {
          setIsCompleting(false)
        }
      }
    }

    completeOnboarding()
  }, [loading, state, complete, isCompleting])

  // If already completed, use stored state
  useEffect(() => {
    if (!loading && state?.is_completed && !summary) {
      setSummary({
        accountsCreated: 0, // Will be fetched from actual data
        categoriesCount: 13,
        budgetsCreated: 0,
        durationSeconds: 0
      })
    }
  }, [loading, state, summary])

  const handleGoToDashboard = () => {
    router.push('/')
  }

  if (loading || isCompleting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Finalizing your setup...</p>
        </div>
      </div>
    )
  }

  return (
    <CompletionScreen
      summary={summary || {
        accountsCreated: 0,
        categoriesCount: 13,
        budgetsCreated: 0,
        durationSeconds: 0
      }}
      onGoToDashboard={handleGoToDashboard}
    />
  )
}
