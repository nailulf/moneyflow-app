'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  HeartPulse,
  PieChart,
  Target,
  MessageCircle,
  ArrowRight,
  ChevronLeft,
  Check,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { FunnelProgress } from '@/components/features/onboarding/funnel/FunnelProgress'
import { cn } from '@/lib/utils'

type Intent = 'health' | 'budget' | 'goal' | 'other'

interface Option {
  id: Intent
  testId: string
  icon: LucideIcon
  titleKey: string
  subKey: string
  /** Tinted icon-tile classes (multi-color per design G899N). */
  tint: string
  /** Where Continue routes once this option is chosen. */
  destination: string
}

const OPTIONS: Option[] = [
  {
    id: 'health',
    testId: 'intent-health',
    icon: HeartPulse,
    titleKey: 'intent.healthTitle',
    subKey: 'intent.healthSub',
    tint: 'bg-tint-teal-bg text-tint-teal-fg',
    destination: '/start/health-check',
  },
  {
    id: 'budget',
    testId: 'intent-budget',
    icon: PieChart,
    titleKey: 'intent.budgetTitle',
    subKey: 'intent.budgetSub',
    tint: 'bg-tint-blue-bg text-tint-blue-fg',
    destination: '/start/budget/income',
  },
  {
    id: 'goal',
    testId: 'intent-goal',
    icon: Target,
    titleKey: 'intent.goalTitle',
    subKey: 'intent.goalSub',
    tint: 'bg-tint-blue-bg text-tint-blue-fg',
    destination: '/start/goal/type',
  },
  {
    id: 'other',
    testId: 'intent-other',
    icon: MessageCircle,
    titleKey: 'intent.otherTitle',
    subKey: 'intent.otherSub',
    tint: 'bg-tint-amber-bg text-tint-amber-fg',
    destination: '/',
  },
]

/** Intent picker (design Row A — "What brings you here today?"). */
export default function IntentPage() {
  const t = useTranslations('start')
  const router = useRouter()
  const [selected, setSelected] = useState<Intent | null>(null)

  const handleContinue = () => {
    const opt = OPTIONS.find((o) => o.id === selected)
    if (opt) router.push(opt.destination)
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-10">
      <header className="py-5">
        {/* Top row: back chevron · progress dots · Skip */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/start')}
            aria-label={t('intent.back')}
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <FunnelProgress total={4} current={0} />
          <button
            type="button"
            onClick={() => router.push('/')}
            className="shrink-0 text-sm leading-body-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('intent.skip')}
          </button>
        </div>

        {/* Title block. Skip proceeds to home as a guest. */}
        <div className="mt-6">
          <h1 className="text-2xl leading-title-3 font-bold text-foreground">
            {t('intent.title')}
          </h1>
          <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
            {t('intent.subtitle')}
          </p>
        </div>
      </header>

      {/* Option cards (single-select) */}
      <div className="mt-2 flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const active = selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              data-testid={opt.testId}
              aria-pressed={active}
              onClick={() => setSelected(opt.id)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border bg-card px-4 py-4 text-left shadow-card transition-colors',
                active
                  ? 'border-primary bg-selected'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]',
                  opt.tint
                )}
              >
                <opt.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-md leading-body-lg font-semibold text-foreground">
                  {t(opt.titleKey)}
                </span>
                <span className="block text-sm leading-body-sm text-muted-foreground">
                  {t(opt.subKey)}
                </span>
              </span>
              {/* Radio indicator (right edge) */}
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  active
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30 bg-transparent'
                )}
                aria-hidden="true"
              >
                {active && (
                  <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Continue — disabled until a card is selected */}
      <Button
        className="mt-auto h-[52px] w-full gap-2 rounded-[14px] text-md"
        disabled={selected === null}
        onClick={handleContinue}
      >
        {t('intent.continue')}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* Guest reassurance — no account required */}
      <p className="mt-3 text-center text-xs leading-caption text-muted-foreground">
        {t('intent.guestNote')}
      </p>
    </div>
  )
}
