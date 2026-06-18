'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/atoms/button'

/**
 * Shared conversion call-to-action for the funnel RESULT screens (goal plan,
 * budget plan, health score). Each flow's result page IS the conversion point
 * (design IlDZo/tAKTn/n8X4lA) — there is no separate "your plan is ready"
 * intro screen. Primary "Create free account" routes straight to the
 * email/OAuth form (`/start/save`); the guest + login exits sit below it.
 */
export function ConversionCtaBlock({ disabled = false }: { disabled?: boolean }) {
  const t = useTranslations('start.conversionCta')
  const router = useRouter()

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <Button
        className="h-[52px] w-full gap-2 rounded-[14px] text-md"
        disabled={disabled}
        onClick={() => router.push('/start/save')}
      >
        {t('createAccount')}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Button>
      <div className="flex items-center gap-2 text-sm leading-body-sm">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="font-medium text-muted-foreground hover:text-foreground"
        >
          {t('continueAsGuest')}
        </button>
        <span className="text-muted-foreground/40" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="font-medium text-primary hover:text-primary/80"
        >
          {t('login')}
        </button>
      </div>
    </div>
  )
}
