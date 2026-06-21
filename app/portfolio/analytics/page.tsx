'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { PortfolioNavigation } from '@/components/features/navigation/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/molecules/card"
import { useAccounts } from '@/contexts/AccountContext'
import { useAllHoldings } from '@/hooks/useHoldings'
import { portfolioTotals, allocation } from '@/lib/portfolio-utils'
import { formatCurrency } from '@/lib/data-utils'

export default function PortfolioAnalyticsPage() {
  const t = useTranslations('portfolio')
  const { accounts } = useAccounts()
  const { holdings, isLoading } = useAllHoldings()

  const investmentAccounts = useMemo(() => accounts.filter((a) => a.type === 'INVESTMENT'), [accounts])
  const totals = useMemo(() => portfolioTotals(holdings), [holdings])
  const slices = useMemo(() => allocation(holdings), [holdings])
  const baseCurrency = investmentAccounts[0]?.currency ?? 'IDR'

  return (
    <div className="flex flex-col h-full">
      <PortfolioNavigation />

      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Analytics</h2>
              <p className="text-muted-foreground">Portfolio performance metrics based on your holdings</p>
            </div>

            {isLoading && (
              <p className="text-sm text-muted-foreground">Loading analytics…</p>
            )}

            {/* Honest figures — sourced from real holdings */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Portfolio Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {holdings.length === 0 ? '—' : formatCurrency(totals.totalValue, baseCurrency)}
                  </div>
                  <div className="text-sm text-muted-foreground">Current market value</div>
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost Basis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {holdings.length === 0 ? '—' : formatCurrency(totals.totalCostBasis, baseCurrency)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total invested at purchase price</div>
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unrealised Gain / Loss</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground italic">
                    {totals.totalCostBasis === 0 ? '—' : t('hero.gainPlaceholder')}
                  </div>
                  {totals.totalCostBasis === 0 && (
                    <div className="text-sm text-muted-foreground">Add holdings to see gain/loss</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Asset-class allocation */}
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Asset Class Allocation</CardTitle>
                <CardDescription>Distribution across asset classes based on current value</CardDescription>
              </CardHeader>
              <CardContent>
                {slices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No holdings yet. Add assets to see allocation.</p>
                ) : (
                  <div className="space-y-4">
                    {slices.map((s) => (
                      <div key={s.assetClass} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{s.assetClass}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">{s.pct}%</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatCurrency(s.value, baseCurrency)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${s.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metrics that require price history — not fabricated */}
            <Card className="rounded-xl border-dashed">
              <CardHeader>
                <CardTitle className="text-muted-foreground">Advanced Metrics</CardTitle>
                <CardDescription>
                  Annualised return, volatility, Sharpe ratio, beta, and max drawdown require historical
                  price data — not yet available. These will appear once price-history tracking is added.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic">
                  Needs price history — coming in a future release.
                </p>
              </CardContent>
            </Card>
          </div>
        </MainContent>

        <SideContent>
          <div className="space-y-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Holdings Count</CardTitle>
                <CardDescription>Number of positions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Positions</span>
                    <span className="font-medium">{holdings.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Asset Classes</span>
                    <span className="font-medium">{slices.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Accounts</span>
                    <span className="font-medium">{investmentAccounts.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SideContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}
