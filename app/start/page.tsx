'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Wallet,
  PieChart,
  Target,
  TrendingUp,
  HeartPulse,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'

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
      {/* Top bar: brand wordmark + log-in link */}
      <header className="flex items-center justify-between py-5">
        <span className="text-xl leading-title-4 font-bold text-foreground">
          {t('brand')}
        </span>
        <Link
          href="/login"
          className="text-sm leading-body-sm font-medium text-primary hover:text-primary/80"
        >
          {t('login')}
        </Link>
      </header>

      {/* Navy hero card */}
      <section className="rounded-[20px] bg-hero-gradient p-6 text-hero-foreground shadow-floating">
        <h1 className="text-3xl leading-title-2 font-bold">{t('hero.headline')}</h1>
        <p className="mt-3 text-md leading-body-lg text-hero-muted">{t('hero.subtext')}</p>
      </section>

      {/* Feature list */}
      <section className="mt-8">
        <h2 className="text-sm leading-body-sm font-semibold text-muted-foreground">
          {t('features.title')}
        </h2>
        <ul className="mt-4 flex flex-col gap-4">
          {FEATURES.map(({ icon: Icon, titleKey, subKey, tint }) => (
            <li key={titleKey} className="flex items-start gap-3">
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

      {/* Subtle skip-to-signup link (secondary affordance, not a CTA) */}
      <Link
        href="/register"
        className="mt-6 text-center text-sm leading-body-sm text-muted-foreground hover:text-foreground"
      >
        {t('createAccountLink')}
      </Link>
    </div>
  )
}
