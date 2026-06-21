'use client'

import type { LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/data-utils'

interface Props {
  icon: LucideIcon
  balance: number
  currency: string
}

export function AccountBalanceHero({ icon: Icon, balance, currency }: Props) {
  const t = useTranslations('accountDetail')
  return (
    <section className="rounded-[20px] bg-hero-gradient p-5 text-hero-foreground shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-hero-foreground/10">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="text-sm leading-body-sm text-hero-muted">{t('hero.currentBalance')}</span>
      </div>
      <p className="mt-3 text-3xl leading-title-2 font-bold">{formatCurrency(balance, currency)}</p>
    </section>
  )
}
