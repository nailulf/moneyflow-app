'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Landmark, Smartphone, House, Car, CreditCard, TrendingUp, ChevronRight, X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_ROWS: Array<{ key: string; href: string; icon: LucideIcon; iconClasses: string }> = [
  { key: 'bank', href: '/accounts/new/bank', icon: Landmark, iconClasses: 'bg-tint-blue-bg text-tint-blue-fg' },
  { key: 'digitalWallet', href: '/accounts/new/bank?kind=wallet', icon: Smartphone, iconClasses: 'bg-tint-teal-bg text-tint-teal-fg' },
  { key: 'property', href: '/accounts/new/property', icon: House, iconClasses: 'bg-tint-green-bg text-tint-green-fg' },
  { key: 'vehicle', href: '/accounts/new/vehicle', icon: Car, iconClasses: 'bg-tint-amber-bg text-tint-amber-fg' },
  { key: 'creditCard', href: '/accounts/new/credit-card', icon: CreditCard, iconClasses: 'bg-destructive/10 text-destructive' },
  { key: 'investment', href: '/accounts/new/investment', icon: TrendingUp, iconClasses: 'bg-tint-purple-bg text-tint-purple-fg' },
]

/** 08 — Select Account Type (design `fkC2k`). */
export default function AccountTypeSelectPage() {
  const t = useTranslations('accountCreate')
  const router = useRouter()
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-0 pt-3 pb-10 md:pt-8">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push('/accounts')}
          aria-label={t('typeSelect.close')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
        >
          <X className="h-4 w-4 text-foreground" aria-hidden="true" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-lg leading-body-lg font-bold text-foreground">
          {t('typeSelect.title')}
        </h1>
        <span className="h-9 w-9 shrink-0" aria-hidden="true" />
      </header>
      <p className="text-sm leading-body-sm text-muted-foreground">{t('typeSelect.choose')}</p>
      <div className="divide-y divide-muted rounded-2xl bg-card shadow-card">
        {TYPE_ROWS.map((row) => (
          <Link
            key={row.key}
            href={row.href}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
          >
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]', row.iconClasses)}>
              <row.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-sm leading-body-sm font-semibold text-foreground">
              {t(`typeSelect.types.${row.key}`)}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  )
}
