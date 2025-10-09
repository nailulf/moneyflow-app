'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AreaChart, Area, XAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { TrendingUp, TrendingDown, Loader2, Wallet, Banknote, Home, Car, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  fetchNetWorthData,
  categorizeAccounts,
  getNetWorthChange,
  type NetWorthResponse,
  type AccountCategory
} from '@/lib/net-worth-utils'
import { formatCurrency } from '@/lib/data-utils'
import { AccountManager } from '@/components/AccountManager'
import { AccountProvider, useAccounts } from '@/contexts/AccountContext'
import { formatDistanceToNow } from 'date-fns'

interface NetWorthOverviewProps {
  userId: string
  onAddAccount?: () => void
}

type TimePeriod = "1W" | "1M" | "3M" | "1Y" | "5Y" | "ALL"

const timePeriods: { value: TimePeriod; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "1Y", label: "1Y" },
  { value: "5Y", label: "5Y" },
  { value: "ALL", label: "ALL" },
]

const chartConfig = {
  value: {
    label: "Net Worth",
    color: "hsl(var(--chart-1))",
  },
}

// Internal component that uses AccountContext
function NetWorthContent({ userId, onAddAccount }: NetWorthOverviewProps) {
  const { accounts, loading: accountsLoading, error: accountsError } = useAccounts()
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("1Y")
  const [netWorthData, setNetWorthData] = useState<NetWorthResponse | null>(null)
  const [accountCategories, setAccountCategories] = useState<AccountCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getAccountIcon = (type: string, name: string) => {
    switch (type) {
      case 'CASH':
        return <Wallet className="h-4 w-4" />
      case 'BANK':
        return <Banknote className="h-4 w-4" />
      case 'INVESTMENT':
        return <Coins className="h-4 w-4" />
      case 'OTHER':
        if (/rumah|house|home|apt|apartment|estate|property/i.test(name)) {
          return <Home className="h-4 w-4" />
        }
        return <Car className="h-4 w-4" />
      default:
        return <Wallet className="h-4 w-4" />
    }
  }

  const refreshNetWorth = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await fetchNetWorthData(userId, selectedPeriod)
      setNetWorthData(data)

      const assetOwned = data.accounts?.length
        ? data.accounts
        : (accounts?.map(a => ({ ...a, currentBalance: a.balance || 0 })) ?? [])


      setAccountCategories(categorizeAccounts(assetOwned))
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load net worth data')
    } finally {
      setLoading(false)
    }
  }, [userId, selectedPeriod, accounts])

  useEffect(() => {
    refreshNetWorth()
  }, [refreshNetWorth])

  const netWorthChange = netWorthData ? getNetWorthChange(netWorthData.netWorthData) : { amount: 0, percentage: 0 }
  const isPositiveChange = netWorthChange.amount >= 0

  // Derived totals and category groups for rendering
  const assetsTotal = accountCategories.reduce((sum, cat) => {
    return sum + Math.max(0, cat.total)
  }, 0)
  const liabilitiesTotal = Math.abs(accountCategories.reduce((sum, cat) => {
    return sum + Math.min(0, cat.total)
  }, 0))
  // Group accounts by type and sum balances for asset categories
  const assetCategories = accountCategories.filter(cat => cat.total >= 0)

  const liabilityCategories = accountCategories.filter(cat => cat.accounts.length > 0 && cat.total < 0)
  
  
  if (loading || accountsLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading net worth data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || accountsError) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96 text-red-500">
            <span>Error: {error || accountsError}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!netWorthData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <span>No data available</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{formatCurrency(netWorthData.currentNetWorth)}</CardTitle>
              <div className={cn("flex items-center text-sm", isPositiveChange ? "text-green-600" : "text-red-600")}>
                {isPositiveChange ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {formatCurrency(Math.abs(netWorthChange.amount))} ({Math.abs(netWorthChange.percentage).toFixed(1)}%)
              </div>
            </div>
            
            {/* Time Period Selector */}
            <div className="flex space-x-1">
              {timePeriods.map((period) => (
                <Button
                  key={period.value}
                  variant={selectedPeriod === period.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPeriod(period.value)}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <AreaChart
            data={netWorthData.netWorthData}
            margin={{ top: 8, right: 16, left: 16, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              interval="preserveStartEnd"
              padding={{ left: 8, right: 16 }}
              tickFormatter={(value) => {
                const date = new Date(value)
                if (selectedPeriod === "1W" || selectedPeriod === "1M" || selectedPeriod === "3M") {
                  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric' })
                }
                if (selectedPeriod === "5Y" || selectedPeriod === "ALL") {
                  // Show full year to avoid ambiguous labels and clipping
                  return date.toLocaleDateString(undefined, { year: 'numeric' })
                }
                return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
              }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ChartContainer>
        {/* Net Worth Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">All</div>
              <div className="text-2xl font-bold">{formatCurrency(assetsTotal - liabilitiesTotal)}</div>
              <div className={cn("flex items-center text-sm", isPositiveChange ? "text-green-600" : "text-red-600")}>
                {isPositiveChange ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {formatCurrency(Math.abs(netWorthChange.amount))} ({Math.abs(netWorthChange.percentage).toFixed(1)}%)
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Assets</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(assetsTotal)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Liabilities</div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(liabilitiesTotal)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Account Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg font-bold">Assets</span>
                <span className="text-lg font-bold">
                  {formatCurrency(assetsTotal)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {assetCategories.map((category, index) => (
                <div key={`asset-cat-${index}`} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {category.name} ({Math.round(category.percentage)}%)
                    </span>
                    <span className="text-sm text-foreground">{formatCurrency(category.total)}</span>
                  </div>
                  <div className="ml-0 space-y-2">
                    {category.accounts
                      .filter(acc => acc.balance >= 0)
                      .map((account, accountIndex) => (
                        <div key={`asset-${index}-${accountIndex}`} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full border bg-muted">
                              {getAccountIcon(account.type, account.name)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{account.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Added {account.created_at ? formatDistanceToNow(new Date(account.created_at), { addSuffix: true }) : 'recently'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{formatCurrency(account.currentBalance)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {assetCategories.length === 0 && (
                <div className="text-sm text-muted-foreground">No assets</div>
              )}
            </CardContent>
          </Card>

          {/* Liabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg font-bold">Liabilities</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(liabilitiesTotal)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {liabilityCategories.map((category, index) => (
                <div key={`liab-cat-${index}`} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {category.name}
                    </span>
                    <span className="text-sm text-foreground">
                      {formatCurrency(Math.abs(category.total))}
                    </span>
                  </div>
                  <div className="ml-0 space-y-2">
                    {category.accounts
                      .filter(acc => acc.currentBalance < 0)
                      .map((account, accountIndex) => (
                        <div key={`liab-${index}-${accountIndex}`} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full border bg-muted">
                              {getAccountIcon(account.type, account.name)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{account.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Added {account.created_at ? formatDistanceToNow(new Date(account.created_at), { addSuffix: true }) : 'recently'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{formatCurrency(Math.abs(account.currentBalance))}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {liabilityCategories.length === 0 && (
                <div className="text-sm text-muted-foreground">No liabilities</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Manager */}
        <div className="flex justify-center">
          <AccountManager 
            userId={userId} 
            onAccountUpdated={() => {
              // Refresh net worth data when accounts are updated
              const loadNetWorthData = async () => {
                try {
                  setLoading(true)
                  setError(null)
                  
                  const data = await fetchNetWorthData(userId, selectedPeriod)
                  setNetWorthData(data)
                  
                  // Categorize accounts for display
                  const categories = categorizeAccounts(data.accounts)
                  setAccountCategories(categories)
                  
                } catch (err) {
                  console.error('Error fetching net worth data:', err)
                  setError(err instanceof Error ? err.message : 'Failed to load net worth data')
                } finally {
                  setLoading(false)
                }
              }
              loadNetWorthData()
              
              // Also call the optional onAddAccount callback if provided
              onAddAccount?.()
            }}
            className="w-full max-w-sm"
          />
        </div>
      </div>
    </div>
  )
}

// Main component that wraps NetWorthContent with AccountProvider  
export default function NetWorthOverview({ userId, onAddAccount }: NetWorthOverviewProps) {
  return (
    <AccountProvider userId={userId}>
      <NetWorthContent userId={userId} onAddAccount={onAddAccount} />
    </AccountProvider>
  )
}