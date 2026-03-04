'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useOnboardingStatus } from '@/hooks/useOnboardingQuery'
import { Button } from '@/components/ui/atoms/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/molecules/dialog'
import { Sparkles, Wallet, PieChart, TrendingUp } from 'lucide-react'
import { Analytics } from '@/lib/analytics/amplitude'
import { useTranslations } from 'next-intl'

export function OnboardingBanner() {
  const t = useTranslations('dashboard.onboarding')
  const { user } = useAuth()
  const { openModal } = useOnboarding()
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
    Analytics.track('Onboarding Banner Dismissed', {
      action: 'maybe_later',
      current_phase: onboarding?.current_phase
    })
    if (user?.id) {
      localStorage.setItem(`onboarding_popup_dismissed_${user.id}`, 'true')
    }
    setIsOpen(false)
  }

  const handleComplete = () => {
    Analytics.track('Onboarding Banner Complete Setup Clicked', {
      current_phase: onboarding?.current_phase
    })
    setIsOpen(false)
    openModal()
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
          <div className="flex justify-center mb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-sm">{t('title')}</DialogTitle>
          <DialogDescription className="text-base">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {([
            { icon: Wallet, key: 'features.trackExpenses' },
            { icon: PieChart, key: 'features.createBudgets' },
            { icon: TrendingUp, key: 'features.understandSpending' },
          ] as const).map(({ icon: Icon, key }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">{t(key)}</span>
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogFooter>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleComplete}>
            {t('completeSetup')}
          </Button>
          <Button variant="ghost" onClick={handleDismiss}>
            {t('maybeLater')}
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  )
}
