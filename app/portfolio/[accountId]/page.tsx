'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { useHoldings } from '@/hooks/useHoldings'
import { useHoldingsInBase } from '@/hooks/useHoldingsInBase'
import { portfolioTotals } from '@/lib/portfolio-utils'
import { isEmptyAccount } from '@/lib/portfolio-screen-utils'

const BASE_CURRENCY = 'IDR'
import { PortfolioValueHero } from '@/components/features/portfolio/PortfolioValueHero'
import { AccountInsightCards } from '@/components/features/portfolio/AccountInsightCards'
import { HoldingsByClassList } from '@/components/features/portfolio/HoldingsByClassList'
import { InvestmentAccountEmptyState } from '@/components/features/portfolio/InvestmentAccountEmptyState'

export default function AccountDetailPage() {
  const t = useTranslations('portfolio')
  const router = useRouter()
  const { accountId } = useParams<{ accountId: string }>()
  const queryClient = useQueryClient()
  const { accounts } = useAccounts()
  const { data: holdings = [], isLoading } = useHoldings(accountId)

  const account = accounts.find((a) => a.id === accountId)

  // Holdings can be priced in different currencies (USD US-stocks/ETFs alongside IDR).
  // Convert each to IDR so the value hero and grouped rows present one consistent base.
  const displayHoldings = useHoldingsInBase(holdings, BASE_CURRENCY)
  const totals = useMemo(() => portfolioTotals(displayHoldings), [displayHoldings])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['holdings', accountId] })
    queryClient.invalidateQueries({ queryKey: ['all-holdings'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['net-worth'] })
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pt-3 pb-10 md:pt-8">
      <header className="flex items-center gap-2">
        <button type="button" onClick={() => router.push('/portfolio')} aria-label={t('detail.back')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card shadow-card">
          <ArrowLeft className="h-4 w-4 text-foreground" aria-hidden="true" />
        </button>
        <span className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-body-lg font-bold text-foreground">{account?.name ?? ''}</h1>
          <span className="block truncate text-tiny text-muted-foreground">{t('accountSubtitle')}</span>
        </span>
        {!isLoading && !isEmptyAccount(holdings) && (
          <button type="button" onClick={() => router.push(`/portfolio/${accountId}/add`)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm leading-none font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('detail.addAsset')}
          </button>
        )}
      </header>

      {!isLoading && isEmptyAccount(holdings) ? (
        <InvestmentAccountEmptyState
          accountName={account?.name ?? ''}
          onAddAsset={() => {
            // TODO(SP3): pass ?class=${assetClass} once the add page reads a class query param
            router.push(`/portfolio/${accountId}/add`)
          }}
        />
      ) : (
        <>
          <PortfolioValueHero totalValue={totals.totalValue} totalGainLoss={totals.totalGainLoss}
            totalGainLossPct={totals.totalGainLossPct} assetCount={holdings.length} currency={BASE_CURRENCY} />

          <AccountInsightCards />

          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-sm leading-body-sm font-semibold text-muted-foreground">{t('detail.holdings')}</h2>
            <HoldingsByClassList
              holdings={displayHoldings}
              onSelect={(h) => router.push(`/portfolio/${accountId}/${h.id}`)}
            />
          </section>
        </>
      )}
    </div>
  )
}
