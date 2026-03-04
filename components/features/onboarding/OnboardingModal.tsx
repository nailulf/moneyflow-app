'use client'

import { useTranslations } from 'next-intl'
import { useOnboarding } from '@/contexts/OnboardingContext'
import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/components/ui/molecules/dialog'
import { OnboardingModalContent } from './OnboardingModalContent'

export function OnboardingModal() {
  const t = useTranslations('onboarding.modal')
  const { isModalOpen, needsOnboarding, loading } = useOnboarding()

  // Don't render if not needed or still loading initial state
  if (loading || !needsOnboarding) {
    return null
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={true}
        className="sm:max-w-2xl max-h-[90vh] overflow-hidden p-6"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Hidden title for screen reader accessibility */}
        <DialogTitle className="sr-only">{t('srTitle')}</DialogTitle>
        <OnboardingModalContent />
      </DialogContent>
    </Dialog>
  )
}
