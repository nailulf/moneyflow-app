'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboardingStatus } from '@/hooks/useOnboardingQuery'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sparkles, Wallet, PieChart, TrendingUp } from 'lucide-react'

const FEATURES = [
  { icon: Wallet, text: 'Track expenses across all accounts' },
  { icon: PieChart, text: 'Create budgets that work' },
  { icon: TrendingUp, text: 'Understand your spending' },
]

export function OnboardingBanner() {
  const { user } = useAuth()
  const { data: onboarding, isLoading } = useOnboardingStatus({
    userId: user?.id || '',
    enabled: !!user?.id
  })
  const [isOpen, setIsOpen] = useState(false)

  // Check if popup was dismissed in localStorage and show if not
  useEffect(() => {
    if (user?.id && onboarding && !onboarding.is_completed && onboarding.is_skipped) {
      const dismissed = localStorage.getItem(`onboarding_popup_dismissed_${user.id}`)
      if (dismissed !== 'true') {
        // Small delay to let the page load first
        const timer = setTimeout(() => setIsOpen(true), 500)
        return () => clearTimeout(timer)
      }
    }
  }, [user?.id, onboarding])

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`onboarding_popup_dismissed_${user.id}`, 'true')
    }
    setIsOpen(false)
  }

  const handleComplete = () => {
    setIsOpen(false)
    // Navigation is handled by the Link component
  }

  // Don't render if:
  // - Still loading
  // - No onboarding record
  // - Onboarding is completed
  // - Onboarding is not skipped (user is in onboarding flow)
  if (
    isLoading ||
    !onboarding ||
    onboarding.is_completed ||
    !onboarding.is_skipped
  ) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">Complete Your Setup</DialogTitle>
          <DialogDescription className="text-base">
            You haven&apos;t finished setting up MoneyFlow. Complete the setup to unlock all features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {FEATURES.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <feature.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">{feature.text}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button asChild onClick={handleComplete}>
            <Link href="/welcome">
              Complete Setup
            </Link>
          </Button>
          <Button variant="ghost" onClick={handleDismiss}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
