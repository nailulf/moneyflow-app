'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useGuestGuard } from '@/hooks/useGuestGuard'
import { useAllHoldings } from '@/hooks/useHoldings'
import { useHoldingsInBase } from '@/hooks/useHoldingsInBase'
import { portfolioTotals, allocation, gainLoss } from '@/lib/portfolio-utils'
import { topHoldings, hasInvestmentAccounts } from '@/lib/portfolio-screen-utils'
import { NavUser } from '@/components/features/navigation/nav-user'
import { formatCurrency } from '@/lib/data-utils'
import { PortfolioValueHero } from './PortfolioValueHero'
import { AllocationBars } from './AllocationBars'
import { StickyScreenHeader } from '@/components/features/navigation/StickyScreenHeader'
import { TopHoldingsCard, type TopHoldingRow } from './TopHoldingsCard'
import { PortfolioEmptyState } from './PortfolioEmptyState'

const TOP_N = 5
const BASE_CURRENCY = 'IDR'

export function PortfolioScreen() {
  const t = useTranslations('portfolio')
  const router = useRouter()
  const { user } = useAuth()
  const { accounts } = useAccounts()
  const { guard } = useGuestGuard()
  const { holdings } = useAllHoldings()

  const investmentAccounts = useMemo(() => accounts.filter((a) => a.type === 'INVESTMENT'), [accounts])

  // Accounts can be priced in different currencies — convert all holdings to IDR before totalling,
  // allocating, and ranking so the figures aren't a naive cross-currency sum.
  const displayHoldings = useHoldingsInBase(holdings, BASE_CURRENCY)
  const totals = useMemo(() => portfolioTotals(displayHoldings), [displayHoldings])
  const slices = useMemo(() => allocation(displayHoldings), [displayHoldings])
  const top: TopHoldingRow[] = useMemo(
    () => topHoldings(displayHoldings, TOP_N).map((h) => ({
      id: h.id, symbol: h.symbol, name: h.name, assetClass: h.asset_class,
      value: h.current_value, gainLoss: gainLoss(h), currency: h.currency,
    })),
    [displayHoldings]
  )

  const userData = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    avatar: user?.user_metadata?.avatar_url || '/avatars/01.svg',
  }
  const holdingsByAccount = (id: string) => holdings.filter((h) => h.account_id === id).length

  const handleAddAccount = () => guard(() => router.push('/accounts/new/investment'))

  return (
    <div className="flex flex-col gap-5 pt-3 md:hidden">
      <StickyScreenHeader>
        <h1 className="text-2xl font-bold leading-title-3 text-foreground">{t('title')}</h1>
        <div className="flex shrink-0 items-center gap-2">
          {hasInvestmentAccounts(accounts) && (
            <button type="button" onClick={handleAddAccount}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm leading-none font-semibold text-primary-foreground transition-transform active:scale-95">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('newAccount')}
            </button>
          )}
          <NavUser user={userData} />
        </div>
      </StickyScreenHeader>

      {!hasInvestmentAccounts(accounts) ? (
        <div className="px-5">
          <PortfolioEmptyState onAddAccount={handleAddAccount} />
        </div>
      ) : (
        <>
          <PortfolioValueHero
            totalValue={totals.totalValue} totalGainLoss={totals.totalGainLoss}
            totalGainLossPct={totals.totalGainLossPct} assetCount={holdings.length} currency={BASE_CURRENCY}
          />

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-md leading-body-lg font-bold text-foreground">{t('accounts.title')}</h2>
              <button type="button" onClick={() => router.push('/accounts')} className="text-sm leading-body-sm text-primary">{t('accounts.seeAll')}</button>
            </div>
            {investmentAccounts.length === 0 ? (
              <p className="rounded-2xl bg-card p-4 text-sm leading-body-sm text-muted-foreground shadow-card">{t('accounts.empty')}</p>
            ) : (
              <div className="divide-y divide-muted rounded-2xl bg-card shadow-card">
                {investmentAccounts.map((a) => (
                  <button key={a.id} type="button" onClick={() => router.push(`/portfolio/${a.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm leading-body-sm font-semibold text-foreground">{a.name}</span>
                      {a.broker && <span className="text-tiny text-muted-foreground">{a.broker}</span>}
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="text-sm leading-body-sm font-bold text-foreground">{formatCurrency(a.currentBalance ?? a.balance, a.currency)}</span>
                      <span className="text-tiny text-muted-foreground">{t('accounts.holdings', { count: holdingsByAccount(a.id) })}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <AllocationBars slices={slices} />
          <TopHoldingsCard rows={top} />
        </>
      )}
    </div>
  )
}
