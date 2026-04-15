'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useOnboardingStatus } from '@/hooks/useOnboardingQuery'
import { preferences } from '@/lib/api/user-preferences'
import { Analytics } from '@/lib/analytics/amplitude'
import { cn } from '@/lib/utils'
import {
  Rocket,
  Check,
  ArrowRight,
  X,
  Receipt,
  Tag,
  Target,
  Upload,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { OnboardingPhase } from '@/types/database'

// Banner-card color variants — see Pencil file node 1ZsLI. Default 'warm'
// (yellow gradient header) to match the launch design; other variants are
// wired up so A/B tests can flip via a prop later.
type BannerVariant =
  | 'warm'
  | 'mint'
  | 'primary'
  | 'teal'
  | 'warm-tinted'
  | 'mint-tinted'
  | 'sky-tinted'

interface OnboardingBannerProps {
  variant?: BannerVariant
}

// Maps the backend phase to a step index. welcome=0 means "not yet started"
// which still counts as 0/4 completed. Each subsequent phase represents a
// completed step.
const PHASE_STEP_INDEX: Record<OnboardingPhase, number> = {
  welcome: 0,
  account_setup: 1,
  categories: 2,
  budget_setup: 3,
  completed: 4,
}

interface StepConfig {
  id: string
  icon: typeof Receipt
  labelKey: string
  subLabelKey: string
  activeSubLabelKey?: string
  doneLabelKey: string
}

// The 4 activation steps shown in the banner. These mirror the redesign in
// Pencil — the labels come from i18n so they can be translated per-locale.
const STEPS: StepConfig[] = [
  {
    id: 'firstExpense',
    icon: Receipt,
    labelKey: 'steps.firstExpense.title',
    subLabelKey: 'steps.firstExpense.subtitle',
    activeSubLabelKey: 'steps.nextStep',
    doneLabelKey: 'steps.firstExpense.done',
  },
  {
    id: 'categories',
    icon: Tag,
    labelKey: 'steps.categories.title',
    subLabelKey: 'steps.categories.subtitle',
    activeSubLabelKey: 'steps.nextStep',
    doneLabelKey: 'steps.categories.done',
  },
  {
    id: 'firstGoal',
    icon: Target,
    labelKey: 'steps.firstGoal.title',
    subLabelKey: 'steps.firstGoal.subtitle',
    activeSubLabelKey: 'steps.nextStep',
    doneLabelKey: 'steps.firstGoal.done',
  },
  {
    id: 'uploadStatement',
    icon: Upload,
    labelKey: 'steps.uploadStatement.title',
    subLabelKey: 'steps.uploadStatement.subtitle',
    activeSubLabelKey: 'steps.nextStep',
    doneLabelKey: 'steps.uploadStatement.done',
  },
]

// Variant-specific color tokens. Kept inline instead of a ternary chain to
// make the color math easy to read.
const VARIANT_STYLES: Record<
  BannerVariant,
  {
    card: string
    header: string
    headerBorder: string
    title: string
    subtitle: string
    dismiss: string
    progressTrack: string
    progressFill: string
    progressText: string
    iconBg: string
    iconFg: string
    activeStep: string
  }
> = {
  warm: {
    card: 'bg-background',
    header: 'bg-gradient-to-b from-[#F6F8D5] to-[#FBFCE9]',
    headerBorder: 'border-b border-border',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    dismiss: 'text-muted-foreground hover:text-foreground',
    progressTrack: 'bg-background border border-border',
    progressFill: 'bg-success',
    progressText: 'text-foreground',
    iconBg: 'bg-primary',
    iconFg: 'text-primary-foreground',
    activeStep: 'bg-sky-50 dark:bg-sky-950/30',
  },
  mint: {
    card: 'bg-background',
    header: 'bg-gradient-to-b from-[#B8E4D6] to-[#E6F4EE]',
    headerBorder: 'border-b border-border',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    dismiss: 'text-muted-foreground hover:text-foreground',
    progressTrack: 'bg-background border border-border',
    progressFill: 'bg-success',
    progressText: 'text-foreground',
    iconBg: 'bg-secondary',
    iconFg: 'text-secondary-foreground',
    activeStep: 'bg-sky-50 dark:bg-sky-950/30',
  },
  primary: {
    card: 'bg-background',
    header: 'bg-gradient-to-b from-primary to-primary/80',
    headerBorder: 'border-b border-primary/30',
    title: 'text-primary-foreground',
    subtitle: 'text-primary-foreground/70',
    dismiss: 'text-primary-foreground/70 hover:text-primary-foreground',
    progressTrack: 'bg-primary-foreground/10 border border-primary-foreground/30',
    progressFill: 'bg-primary-foreground',
    progressText: 'text-primary-foreground',
    iconBg: 'bg-primary-foreground/20',
    iconFg: 'text-primary-foreground',
    activeStep: 'bg-sky-50 dark:bg-sky-950/30',
  },
  teal: {
    card: 'bg-background',
    header: 'bg-gradient-to-b from-[#4A9A8B] to-[#6BB3A3]',
    headerBorder: 'border-b border-[#4A9A8B]/40',
    title: 'text-white',
    subtitle: 'text-white/75',
    dismiss: 'text-white/75 hover:text-white',
    progressTrack: 'bg-white/20 border border-white/40',
    progressFill: 'bg-white',
    progressText: 'text-white',
    iconBg: 'bg-white/25',
    iconFg: 'text-white',
    activeStep: 'bg-sky-50 dark:bg-sky-950/30',
  },
  'warm-tinted': {
    card: 'bg-[#FDFBE0] dark:bg-background',
    header: 'bg-gradient-to-b from-[#F2F4C8] to-[#F8FAD4]',
    headerBorder: 'border-b border-[#EAEDB8]',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    dismiss: 'text-muted-foreground hover:text-foreground',
    progressTrack: 'bg-background border border-border',
    progressFill: 'bg-success',
    progressText: 'text-foreground',
    iconBg: 'bg-primary',
    iconFg: 'text-primary-foreground',
    activeStep: 'bg-[#F6F8D5]',
  },
  'mint-tinted': {
    card: 'bg-[#EAF6F1] dark:bg-background',
    header: 'bg-gradient-to-b from-[#B8E4D6] to-[#D6EDE2]',
    headerBorder: 'border-b border-[#B8E4D6]',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    dismiss: 'text-muted-foreground hover:text-foreground',
    progressTrack: 'bg-background border border-border',
    progressFill: 'bg-success',
    progressText: 'text-foreground',
    iconBg: 'bg-secondary',
    iconFg: 'text-secondary-foreground',
    activeStep: 'bg-[#D6EDE2]',
  },
  'sky-tinted': {
    card: 'bg-[#EEF4FA] dark:bg-background',
    header: 'bg-gradient-to-b from-[#DCE8F3] to-[#E8F0F8]',
    headerBorder: 'border-b border-[#C5D8EA]',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    dismiss: 'text-muted-foreground hover:text-foreground',
    progressTrack: 'bg-background border border-border',
    progressFill: 'bg-success',
    progressText: 'text-foreground',
    iconBg: 'bg-primary',
    iconFg: 'text-primary-foreground',
    activeStep: 'bg-[#DCE8F3]',
  },
}

export function OnboardingBanner({ variant = 'warm' }: OnboardingBannerProps) {
  const t = useTranslations('dashboard.activationBanner')
  const { user } = useAuth()
  const { openModal } = useOnboarding()
  const { data: onboarding, isLoading } = useOnboardingStatus({
    userId: user?.id || '',
    enabled: !!user?.id,
  })

  // Banner dismiss is persisted in user_settings.activation_banner_dismissed_at
  // so the user's choice survives across devices. We hydrate on mount.
  const [dismissedAt, setDismissedAt] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    preferences
      .getActivationBannerDismissedAt(user.id)
      .then(v => {
        if (!cancelled) setDismissedAt(v)
      })
      .catch(() => {
        if (!cancelled) setDismissedAt(null)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const styles = VARIANT_STYLES[variant]

  // Compute completed step count from onboarding phase. The first step
  // ("record first expense") is what closes the aha gap after onboarding —
  // we mark it done when the user transitions out of welcome.
  const completedIndex = useMemo(() => {
    if (!onboarding) return 0
    if (onboarding.is_completed) return STEPS.length
    return PHASE_STEP_INDEX[onboarding.current_phase as OnboardingPhase] ?? 0
  }, [onboarding])

  const completedCount = Math.min(completedIndex, STEPS.length)
  const totalSteps = STEPS.length
  const percent = Math.round((completedCount / totalSteps) * 100)

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    ''

  const handleDismiss = async () => {
    Analytics.track('activation_banner_dismissed', {
      current_phase: onboarding?.current_phase,
      completed_steps: completedCount,
    })
    setDismissedAt(new Date().toISOString())
    if (user?.id) {
      try {
        await preferences.dismissActivationBanner(user.id)
      } catch (err) {
        console.warn('Failed to persist banner dismiss:', err)
      }
    }
  }

  const handleActiveStep = () => {
    Analytics.track('activation_banner_step_clicked', {
      step: STEPS[completedCount]?.id,
      current_phase: onboarding?.current_phase,
    })
    openModal()
  }

  // Don't render while we don't yet know whether to show:
  // - still loading onboarding status
  // - no onboarding record yet
  // - user has explicitly dismissed (persisted)
  // - onboarding is fully completed (nothing left to nudge)
  if (
    isLoading ||
    dismissedAt === undefined || // still hydrating dismiss state
    !onboarding ||
    dismissedAt !== null ||
    (onboarding.is_completed && completedCount >= totalSteps)
  ) {
    return null
  }

  return (
    <section
      className={cn(
        'w-full overflow-hidden rounded-2xl border border-border shadow-sm',
        styles.card
      )}
      aria-label={t('ariaLabel')}
    >
      {/* Greeting — lives inside the card so the whole thing reads as one component */}
      <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">
          {firstName ? t('greeting', { name: firstName }) : t('greetingFallback')}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {t('subtitle')}
        </p>
      </div>

      {/* Header — gradient band with progress */}
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-5 py-4 sm:px-6',
          styles.header,
          styles.headerBorder
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              styles.iconBg
            )}
          >
            <Rocket className={cn('h-4 w-4', styles.iconFg)} />
          </div>
          <div className="min-w-0">
            <p className={cn('truncate text-sm font-bold', styles.title)}>
              {t('title')}
            </p>
            <p className={cn('truncate text-xs', styles.subtitle)}>
              {t('progress', { completed: completedCount, total: totalSteps })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={cn(
              'relative h-1.5 w-20 overflow-hidden rounded-full sm:w-28',
              styles.progressTrack
            )}
          >
            <div
              className={cn('h-full transition-all', styles.progressFill)}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className={cn('text-xs font-bold tabular-nums', styles.progressText)}>
            {percent}%
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            className={cn('rounded p-0.5 transition-colors', styles.dismiss)}
            aria-label={t('dismiss')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Steps — horizontal tiles on sm+, stacked on mobile */}
      <ul className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {STEPS.map((step, index) => {
          const isDone = index < completedCount
          const isActive = index === completedCount
          const Icon = step.icon
          return (
            <li key={step.id} className={cn(isActive && styles.activeStep)}>
              <button
                type="button"
                disabled={isDone}
                onClick={isActive ? handleActiveStep : undefined}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-4 text-left transition-colors',
                  isActive && 'hover:brightness-95',
                  !isDone && !isActive && 'hover:bg-muted/40',
                  isDone && 'cursor-default'
                )}
              >
                {isDone ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                ) : isActive ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background">
                    <Icon className="h-2.5 w-2.5 text-primary" />
                  </span>
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      'truncate text-xs font-semibold',
                      isDone ? 'text-muted-foreground line-through' : 'text-foreground'
                    )}
                  >
                    {t(step.labelKey as Parameters<typeof t>[0])}
                  </span>
                  <span
                    className={cn(
                      'truncate text-[11px]',
                      isDone
                        ? 'text-success'
                        : isActive
                          ? 'text-primary'
                          : 'text-muted-foreground'
                    )}
                  >
                    {isDone
                      ? t(step.doneLabelKey as Parameters<typeof t>[0])
                      : isActive && step.activeSubLabelKey
                        ? t(step.activeSubLabelKey as Parameters<typeof t>[0])
                        : t(step.subLabelKey as Parameters<typeof t>[0])}
                  </span>
                </span>
                {isActive && (
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
