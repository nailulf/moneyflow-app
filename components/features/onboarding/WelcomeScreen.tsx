'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/atoms/button'
import {
  Wallet,
  Tag,
  Target,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { DialogFooter } from '@/components/ui/molecules/dialog'

interface WelcomeScreenProps {
  userName: string
  onStart: () => void
  onSkip: () => void
}

export function WelcomeScreen({ userName, onStart, onSkip }: WelcomeScreenProps) {
  const t = useTranslations('onboarding.welcome')

  // The redesigned welcome screen lists the concrete setup steps (not app
  // features) so users understand what they're committing to in the 3 minutes.
  const bullets = [
    { icon: Wallet, labelKey: 'bullets.account' as const },
    { icon: Tag, labelKey: 'bullets.categories' as const },
    { icon: Target, labelKey: 'bullets.budget' as const },
  ]

  return (
    // Fill the parent DialogContent so welcome matches the other steps' height.
    // Body grows; footer stays pinned at the bottom.
    <div className="flex flex-col h-full min-h-0">
      {/* Hero — warm yellow block with the sparkles icon, matches Pencil frame eYGBK */}
      <div className="relative mx-[-1rem] sm:mx-[-1.5rem] mb-6 flex h-48 shrink-0 items-center justify-center overflow-hidden bg-[#F6F8D5]">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#B8E4D6]">
          <Sparkles className="h-10 w-10 text-primary" strokeWidth={2.5} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        {/* Greeting */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t('heading', { name: userName })}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {t('tagline')}
          </p>
        </div>

        {/* Bullets — setup steps with per-item duration */}
        <ul className="mt-6 space-y-3 border-t border-border pt-5">
          {bullets.map(({ icon: Icon, labelKey }) => (
            <li key={labelKey} className="flex items-center gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <span className="text-foreground">{t(labelKey)}</span>
            </li>
          ))}
        </ul>

        {/* Duration reassurance */}
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {t('setupTime')}
        </p>
      </div>

      <DialogFooter>
        <div className="mt-4 flex w-full flex-col items-center gap-2 pt-2 sm:flex-row-reverse sm:justify-start">
          <Button onClick={onStart} className="w-full gap-2 sm:w-auto">
            {t('startSetup')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            {t('skipForNow')}
          </Button>
        </div>
      </DialogFooter>
    </div>
  )
}
