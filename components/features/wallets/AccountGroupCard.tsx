'use client'

import { useTranslations } from 'next-intl'
import {
  Landmark, Smartphone, House, Wallet, CreditCard, TrendingUp, Car, Building2,
  type LucideIcon,
} from 'lucide-react'
import { getCategoryTint } from '@/lib/category-style'
import { formatCurrency } from '@/lib/data-utils'
import { effectiveBalance, type WalletAccountLike, type WalletGroupKey } from '@/lib/wallets-utils'
import { cn } from '@/lib/utils'

const GROUP_META: Record<WalletGroupKey, { icon: LucideIcon; iconClasses: string }> = {
  bank: { icon: Landmark, iconClasses: 'bg-tint-blue-bg text-tint-blue-fg' },
  digitalWallets: { icon: Smartphone, iconClasses: 'bg-tint-green-bg text-tint-green-fg' },
  assets: { icon: House, iconClasses: 'bg-tint-amber-bg text-tint-amber-fg' },
  cashOther: { icon: Wallet, iconClasses: 'bg-tint-slate-bg text-tint-slate-fg' },
  loans: { icon: CreditCard, iconClasses: 'bg-destructive/10 text-destructive' },
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  BANK: Landmark,
  DIGITAL_WALLET: Smartphone,
  CASH: Wallet,
  INVESTMENT: TrendingUp,
  PROPERTY: House,
  VEHICLE: Car,
  MORTGAGE: Building2,
  CREDIT_CARD: CreditCard,
  OTHER: Wallet,
}

interface AccountGroupCardProps {
  groupKey: WalletGroupKey
  accounts: WalletAccountLike[]
  onOpen: (accountId: string) => void
}

/** One grouped account card (design `umSgj` etc.): header + divided tappable rows. */
export function AccountGroupCard({ groupKey, accounts, onOpen }: AccountGroupCardProps) {
  const t = useTranslations('wallets')
  const meta = GROUP_META[groupKey]
  const HeaderIcon = meta.icon
  return (
    <section className="rounded-2xl bg-card shadow-card">
      <div className="flex items-center gap-2.5 border-b border-muted px-4 py-3.5">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-[10px]', meta.iconClasses)}>
          <HeaderIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-sm leading-body-sm font-bold text-foreground">{t(`groups.${groupKey}`)}</h2>
        <span className="rounded-[10px] bg-muted px-1.5 py-0.5 text-tiny font-semibold text-muted-foreground">
          {accounts.length}
        </span>
      </div>
      <div className="divide-y divide-muted">
        {accounts.map((account) => {
          const Icon = TYPE_ICONS[account.type] ?? Wallet
          const tint = getCategoryTint(account.name)
          const balance = effectiveBalance(account)
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => onOpen(account.id)}
              aria-label={account.name}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tint.bg)}>
                <Icon className={cn('h-4 w-4', tint.fg)} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm leading-body-sm font-semibold text-foreground">
                {account.name}
              </span>
              <span className="shrink-0 text-sm leading-body-sm font-bold text-foreground">
                {balance < 0 ? `− ${formatCurrency(Math.abs(balance), account.currency)}` : formatCurrency(balance, account.currency)}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
