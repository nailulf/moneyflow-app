'use client'

import { useMemo } from 'react'
import { PortfolioNavigation } from '@/components/features/navigation/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/molecules/card"
import { Badge } from "@/components/ui/atoms/badge"
import { useAccounts } from '@/contexts/AccountContext'
import { useAllHoldings } from '@/hooks/useHoldings'
import { portfolioTotals, allocation, gainLoss, gainLossPct } from '@/lib/portfolio-utils'
import { formatCurrency } from '@/lib/data-utils'

export default function PortfolioHoldingsPage() {
  const { accounts } = useAccounts()
  const { holdings, isLoading } = useAllHoldings()

  const investmentAccounts = useMemo(() => accounts.filter((a) => a.type === 'INVESTMENT'), [accounts])
  const totals = useMemo(() => portfolioTotals(holdings), [holdings])
  const slices = useMemo(() => allocation(holdings), [holdings])
  const baseCurrency = investmentAccounts[0]?.currency ?? 'IDR'

  const allocationPct = (holdingValue: number): number => {
    if (totals.totalValue === 0) return 0
    return Math.round((holdingValue / totals.totalValue) * 1000) / 10
  }

  return (
    <div className="flex flex-col h-full">
      <PortfolioNavigation />

      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Holdings</h2>
              <p className="text-muted-foreground">Detailed view of your investment positions</p>
            </div>

            {isLoading && (
              <p className="text-sm text-muted-foreground">Loading holdings…</p>
            )}

            {!isLoading && holdings.length === 0 && (
              <Card className="rounded-xl">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    No holdings yet. Add assets to an investment account to see them here.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {holdings.map((holding) => {
                const gl = gainLoss(holding)
                const glPct = gainLossPct(holding)
                const allocPct = allocationPct(holding.current_value)
                return (
                  <Card key={holding.id} className="rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{holding.symbol ?? holding.name}</h3>
                              <Badge variant="outline">{allocPct.toFixed(1)}%</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{holding.name}</p>
                            <p className="text-xs text-muted-foreground">{holding.quantity} units · {holding.asset_class}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(holding.current_value, holding.currency)}</div>
                          <div className="text-sm text-muted-foreground">
                            Cost: {formatCurrency(holding.purchase_price * holding.quantity, holding.currency)}
                          </div>
                          <div className={`text-sm font-medium ${glPct >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {glPct >= 0 ? '+' : ''}{glPct.toFixed(1)}%
                            ({gl >= 0 ? '+' : ''}{formatCurrency(gl, holding.currency)})
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </MainContent>

        <SideContent>
          <div className="space-y-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Portfolio Summary</CardTitle>
                <CardDescription>Total holdings overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="font-semibold">{formatCurrency(totals.totalValue, baseCurrency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Gain / Loss</span>
                    <span className={`font-medium ${totals.totalGainLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {totals.totalGainLoss >= 0 ? '+' : ''}{totals.totalGainLossPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Positions</span>
                    <span className="font-medium">{holdings.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Asset Class Breakdown</CardTitle>
                <CardDescription>Distribution by asset type</CardDescription>
              </CardHeader>
              <CardContent>
                {slices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No holdings yet.</p>
                ) : (
                  <div className="space-y-3">
                    {slices.map((s) => (
                      <div key={s.assetClass} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{s.assetClass}</span>
                        <span className="text-sm text-muted-foreground">{s.pct}%</span>
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
  )
}
