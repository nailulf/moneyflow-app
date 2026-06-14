'use client'

import { useMemo } from 'react'
import { PortfolioNavigation } from '@/components/features/navigation/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/molecules/card"
import { PortfolioScreen } from '@/components/features/portfolio/PortfolioScreen'
import { useAccounts } from '@/contexts/AccountContext'
import { useAllHoldings } from '@/hooks/useHoldings'
import { useHoldingsInBase } from '@/hooks/useHoldingsInBase'
import { portfolioTotals, allocation } from '@/lib/portfolio-utils'
import { formatCurrency } from '@/lib/data-utils'

const BASE_CURRENCY = 'IDR'

export default function PortfolioPage() {
  const { accounts } = useAccounts()
  const { holdings } = useAllHoldings()

  const investmentAccounts = useMemo(() => accounts.filter((a) => a.type === 'INVESTMENT'), [accounts])
  // Convert mixed-currency holdings to IDR so totals/allocation aren't a naive cross-currency sum.
  const displayHoldings = useHoldingsInBase(holdings, BASE_CURRENCY)
  const totals = useMemo(() => portfolioTotals(displayHoldings), [displayHoldings])
  const slices = useMemo(() => allocation(displayHoldings), [displayHoldings])
  const baseCurrency = BASE_CURRENCY

  const gainLossLabel = totals.totalGainLoss >= 0
    ? `+${totals.totalGainLossPct}% all-time gain`
    : `${totals.totalGainLossPct}% all-time loss`

  return (
    <div className="flex flex-col h-full">
      {/* Mobile root screen (md:hidden is applied inside PortfolioScreen) */}
      <PortfolioScreen />

      {/* Desktop layout */}
      <div className="hidden md:flex md:flex-col md:h-full">
        <PortfolioNavigation />

        <PageLayout>
          <ContentWrapper>
          <MainContent>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight mb-2">Portfolio Overview</h2>
                <p className="text-muted-foreground">Track your investment performance and allocation</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>Total Portfolio Value</CardTitle>
                    <CardDescription>Your current investment portfolio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {holdings.length === 0 && investmentAccounts.length === 0
                        ? 'No investment accounts yet'
                        : formatCurrency(totals.totalValue, baseCurrency)}
                    </div>
                    <p className="text-xs text-muted-foreground">{gainLossLabel}</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>Total Gain / Loss</CardTitle>
                    <CardDescription>Unrealised gain/loss vs cost basis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${totals.totalGainLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {totals.totalCostBasis === 0
                        ? '—'
                        : `${totals.totalGainLoss >= 0 ? '+' : ''}${formatCurrency(totals.totalGainLoss, baseCurrency)}`}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {totals.totalCostBasis === 0
                        ? 'Add holdings to see performance'
                        : `Cost basis: ${formatCurrency(totals.totalCostBasis, baseCurrency)}`}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Investment Accounts</CardTitle>
                  <CardDescription>Your connected investment accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  {investmentAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No investment accounts yet. Create one to start tracking your portfolio.</p>
                  ) : (
                    <div className="space-y-4">
                      {investmentAccounts.map((a) => (
                        <div key={a.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{a.name}</p>
                            {a.broker && <p className="text-sm text-muted-foreground">{a.broker}</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(a.currentBalance ?? a.balance, a.currency)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </MainContent>

          <SideContent>
            <div className="space-y-4">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Asset Allocation</CardTitle>
                  <CardDescription>Distribution of your investments</CardDescription>
                </CardHeader>
                <CardContent>
                  {slices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No holdings yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {slices.map((s) => (
                        <div key={s.assetClass} className="flex justify-between">
                          <span className="text-sm">{s.assetClass}</span>
                          <span className="text-sm font-medium">{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </SideContent>
          </ContentWrapper>
        </PageLayout>
      </div>
    </div>
  )
}
