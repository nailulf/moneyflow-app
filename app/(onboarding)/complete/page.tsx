'use client'

import { useRouter } from 'next/navigation'
import { CompletionScreen } from '@/components/features/onboarding'

export default function CompletePage() {
  const router = useRouter()

  // In a real app we might pass actual stats via URL params or context
  // For now, we'll use placeholder data as the context might be cleared
  const summary = {
    accountsCreated: 1, 
    categoriesCount: 10,
    budgetsCreated: 1,
    durationSeconds: 180
  }

  const handleGoToDashboard = () => {
    router.push('/')
  }

  return (
    <CompletionScreen 
      summary={summary}
      onGoToDashboard={handleGoToDashboard}
    />
  )
}
