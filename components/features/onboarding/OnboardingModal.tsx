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
  const { isModalOpen, needsOnboarding, state } = useOnboarding()

  // Only gate on whether the user actually needs onboarding. Watching the
  // context-wide `loading` flag here used to cause the modal to flicker
  // between mount/unmount during transient operations (e.g. the budget
  // step's complete() call), which left CompletionView spinning forever.
  // Wait for state to be loaded once before we decide; after that, follow
  // needsOnboarding only.
  if (state === null || !needsOnboarding) {
    return null
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        // Full-screen on mobile so the onboarding flow behaves like a native
        // bottom-sheet / full-page sheet — matches the redesigned mobile
        // screens (390×844). Bordered card on sm+ as before.
        className={
          'w-screen max-w-none h-[100svh] max-h-[100svh] rounded-none border-0 p-4 ' +
          // Pin the dialog to a fixed 85svh on sm+ so every step renders at
          // the same height instead of collapsing on shorter steps. Inner
          // content scrolls when needed (see OnboardingModalContent).
          'sm:w-[calc(100vw-2rem)] sm:h-[85svh] sm:max-w-2xl sm:max-h-[85svh] sm:rounded-lg sm:border sm:p-6 ' +
          'overflow-hidden'
        }
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
