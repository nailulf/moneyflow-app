'use client'

import { useOnboarding } from '@/contexts/OnboardingContext'
import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/components/ui/dialog'
import { OnboardingModalContent } from './OnboardingModalContent'

export function OnboardingModal() {
  const { isModalOpen, needsOnboarding, loading } = useOnboarding()

  // Don't render if not needed or still loading initial state
  if (loading || !needsOnboarding) {
    return null
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-2xl max-h-[90vh] overflow-hidden p-6"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Hidden title for screen reader accessibility */}
        <DialogTitle className="sr-only">Complete your setup</DialogTitle>
        <OnboardingModalContent />
      </DialogContent>
    </Dialog>
  )
}
