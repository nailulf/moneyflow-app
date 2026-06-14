'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Check, Landmark, Smartphone, House, Car, CreditCard, TrendingUp, type LucideIcon,
} from 'lucide-react'
import { InfoBanner } from './InfoBanner'

const TYPE_ICONS: Record<string, LucideIcon> = {
  BANK: Landmark,
  DIGITAL_WALLET: Smartphone,
  PROPERTY: House,
  VEHICLE: Car,
  CREDIT_CARD: CreditCard,
  INVESTMENT: TrendingUp,
}

interface AccountCreatedViewProps {
  account: { name: string; type: string }
  note?: string
}

/** Post-create success view (design `tTPFK`); CTAs vary by account type. */
export function AccountCreatedView({ account, note }: AccountCreatedViewProps) {
  const t = useTranslations('accountCreate')
  const router = useRouter()
  const Icon = TYPE_ICONS[account.type] ?? Landmark
  const isInvestment = account.type === 'INVESTMENT'

  return (
    <div className="flex flex-col items-center gap-5 pt-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <Check className="h-7 w-7 text-success" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold leading-title-3 text-foreground">{t('success.title')}</h1>
      <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-card">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-selected">
          <Icon className="h-4 w-4 text-selected-foreground" aria-hidden="true" />
        </span>
        <span className="text-left">
          <span className="block text-sm leading-body-sm font-semibold text-foreground">{account.name}</span>
          <span className="block text-xs leading-caption text-muted-foreground">
            {t(`success.typeLabels.${account.type}`)}
          </span>
        </span>
      </div>
      {note && <InfoBanner variant="success">{note}</InfoBanner>}
      {isInvestment && <InfoBanner variant="info">{t('success.investmentInfo')}</InfoBanner>}
      <div className="flex w-full flex-col gap-3 pt-2">
        {isInvestment ? (
          <>
            <button
              type="button"
              onClick={() => router.push('/portfolio')}
              className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground"
            >
              {t('success.addAsset')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/portfolio')}
              className="text-sm leading-body-sm font-semibold text-muted-foreground"
            >
              {t('success.viewPortfolio')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/accounts')}
            className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground"
          >
            {t('success.backToWallets')}
          </button>
        )}
      </div>
    </div>
  )
}
