'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronsDown } from 'lucide-react'
import { formatCurrencyCompact } from '@/lib/data-utils'

interface AccountItem {
  id: string
  name: string
}

interface AccountsCardsProps {
  currency: string
  assets: AccountItem[]
  liabilities: AccountItem[]
  assetsTotal: number
  liabilitiesTotal: number
}

const MAX_NAMES = 3

function CardColumn({
  tone, label, badge, amount, items, moreLabel,
}: {
  tone: 'success' | 'destructive'
  label: string
  badge: string
  amount: string
  items: AccountItem[]
  moreLabel: string | null
}) {
  const toneText = tone === 'success' ? 'text-success' : 'text-destructive'
  return (
    <div className={`flex min-w-0 flex-1 flex-col rounded-2xl border p-3.5 ${
      tone === 'success' ? 'border-success/20 bg-success/10' : 'border-destructive/20 bg-destructive/10'
    }`}>
      <div className="flex items-center justify-between gap-1">
        <span className={`flex items-center gap-1.5 text-xs leading-caption font-bold ${toneText}`}>
          <span className={`h-2 w-2 rounded-full ${tone === 'success' ? 'bg-success' : 'bg-destructive'}`} aria-hidden="true" />
          {label}
        </span>
        <span className={`rounded-[10px] px-1.5 py-0.5 text-nano font-semibold ${toneText} ${
          tone === 'success' ? 'bg-success/15' : 'bg-destructive/15'
        }`}>
          {badge}
        </span>
      </div>
      <p className={`mt-1.5 truncate text-xl font-bold leading-title-4 ${toneText}`}>{amount}</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {items.slice(0, MAX_NAMES).map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-xs leading-caption text-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${tone === 'success' ? 'bg-success/60' : 'bg-destructive/60'}`} aria-hidden="true" />
            <span className="truncate">{a.name}</span>
          </li>
        ))}
      </ul>
      {moreLabel && (
        <p className={`mt-auto flex items-center justify-center gap-1 pt-2 text-tiny font-semibold ${toneText}`}>
          <ChevronsDown className="h-3 w-3" aria-hidden="true" />
          {moreLabel}
        </p>
      )}
    </div>
  )
}

/** Assets + Liabilities pair (design `dqmsL` / `w2mgo5`). */
export function AccountsCards({ currency, assets, liabilities, assetsTotal, liabilitiesTotal }: AccountsCardsProps) {
  const t = useTranslations('home')
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-md leading-body-lg font-bold text-foreground">{t('accounts.title')}</h2>
        <Link href="/accounts" className="text-sm leading-body-sm text-primary">{t('accounts.seeAll')}</Link>
      </div>
      <div className="flex items-stretch gap-3">
        <CardColumn
          tone="success"
          label={t('accounts.assets')}
          badge={t('accounts.accountsCount', { count: assets.length })}
          amount={formatCurrencyCompact(assetsTotal, currency)}
          items={assets}
          moreLabel={assets.length > MAX_NAMES ? t('accounts.more', { count: assets.length - MAX_NAMES }) : null}
        />
        <CardColumn
          tone="destructive"
          label={t('accounts.liabilities')}
          badge={t('accounts.loansCount', { count: liabilities.length })}
          amount={`− ${formatCurrencyCompact(liabilitiesTotal, currency)}`}
          items={liabilities}
          moreLabel={liabilities.length > MAX_NAMES ? t('accounts.more', { count: liabilities.length - MAX_NAMES }) : null}
        />
      </div>
    </section>
  )
}
