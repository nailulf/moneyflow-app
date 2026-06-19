'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Wallet,
  PieChart,
  Target,
  TrendingUp,
  HeartPulse,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { LocaleToggle } from '@/components/features/onboarding/LocaleToggle'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous'

/** Feature rows for "Everything your money needs" — each gets its own tint. */
const FEATURES: Array<{
  icon: LucideIcon
  titleKey: string
  subKey: string
  tint: string
}> = [
  {
    icon: Wallet,
    titleKey: 'features.tracking',
    subKey: 'features.trackingSub',
    tint: 'bg-tint-teal-bg text-tint-teal-fg',
  },
  {
    icon: PieChart,
    titleKey: 'features.budgets',
    subKey: 'features.budgetsSub',
    tint: 'bg-tint-green-bg text-tint-green-fg',
  },
  {
    icon: Target,
    titleKey: 'features.goals',
    subKey: 'features.goalsSub',
    tint: 'bg-tint-amber-bg text-tint-amber-fg',
  },
  {
    icon: TrendingUp,
    titleKey: 'features.netWorth',
    subKey: 'features.netWorthSub',
    tint: 'bg-tint-blue-bg text-tint-blue-fg',
  },
]

/** Guest landing (design Row A — first screen). */
export default function StartPage() {
  const t = useTranslations('start')
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col px-5 pb-10">
      {/* Top bar: app brand (icon + wordmark) + log-in pill */}
      <header className="flex items-center justify-between py-5">
        <span className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-card shadow-card">
            <Image
              src="/icons/icon.png"
              alt=""
              width={26}
              height={26}
              className="object-contain"
              priority
            />
          </span>
          <span className="text-xl leading-title-4 font-bold text-foreground">
            {t('brand')}
          </span>
        </span>
        <div className="flex items-center gap-3">
          <LocaleToggle />
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-sm leading-body-sm font-medium text-foreground hover:bg-muted/50"
          >
            {t('login')}
          </Link>
        </div>
      </header>

      {/* Navy hero card */}
      <section className="rounded-[20px] bg-hero-gradient p-6 text-hero-foreground shadow-floating">
        {/* Guest status badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-hero-foreground/10 px-2.5 py-1 text-tiny font-medium text-hero-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('guestPill')}
        </span>

        <h1 className="mt-4 text-3xl leading-title-2 font-bold">
          {t('hero.headline')}
        </h1>
        <p className="mt-3 text-md leading-body-lg text-hero-muted">{t('hero.subtext')}</p>

        {/* Decorative mini bar chart + savings stat */}
        <div className="mt-6 flex h-16 items-end gap-2" aria-hidden="true">
          {[30, 45, 40, 60, 75, 90].map((h, i) => (
            <span
              key={i}
              className={`flex-1 rounded-t ${i >= 4 ? 'bg-accent' : 'bg-chart-bar'}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-tiny text-hero-muted">{t('heroStatLabel')}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-hero-success">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            {t('heroStatDelta')}
          </span>
        </div>
      </section>

      {/* Feature list */}
      <section className="mt-8">
        <h2 className="text-sm leading-body-sm font-semibold text-muted-foreground">
          {t('features.title')}
        </h2>
        <ul className="mt-4 flex flex-col gap-3">
          {FEATURES.map(({ icon: Icon, titleKey, subKey, tint }) => (
            <li
              key={titleKey}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${tint}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-md leading-body-lg font-semibold text-foreground">
                  {t(titleKey)}
                </span>
                <span className="block text-sm leading-body-sm text-muted-foreground">
                  {t(subKey)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2-minute-check highlight card — the landing's single focused action */}
      <section className="mt-8 rounded-2xl border border-primary/20 bg-selected p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/10">
            <HeartPulse className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-md leading-body-lg font-semibold text-foreground">
              {t('healthCheck.title')}
            </h3>
            <p className="mt-1 text-sm leading-body-sm text-muted-foreground">
              {t('healthCheck.subtitle')}
            </p>
          </div>
        </div>
        <Button
          className="mt-4 h-12 w-full rounded-[14px]"
          onClick={() => router.push('/start/intent')}
        >
          {t('healthCheck.cta')}
        </Button>
      </section>

      {/* Secondary affordances (not the primary CTA): sign up directly, or
          browse as a guest. The 2-minute check above remains the focused path. */}
      <p className="mt-6 text-center text-sm leading-body-sm text-muted-foreground">
        {t('registerPrompt')}{' '}
        <button
          type="button"
          onClick={() => router.push('/start/save')}
          className="font-medium text-primary hover:text-primary/80"
        >
          {t('registerLink')}
        </button>
      </p>

      <button
        type="button"
        onClick={async () => {
          await ensureAnonymousSession()
          router.push('/')
        }}
        className="mt-3 text-center text-sm leading-body-sm text-muted-foreground hover:text-foreground"
      >
        {t('browseLink')}
      </button>
    </div>
  )
}
