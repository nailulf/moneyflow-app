'use client'

import React, { useState, useEffect, useCallback, useTransition, Suspense } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/molecules/card'
import { AreaChart, Area, XAxis, Tooltip } from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  Home,
  Car,
  Landmark,
  Coins,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fetchNetWorthData,
  categorizeAccounts,
  getNetWorthChange,
  type NetWorthResponse,
  type AccountCategory,
} from '@/lib/net-worth-utils'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/atoms/skeleton'
import { useAccounts } from '@/contexts/AccountContext'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'

const AccountManagerLazy = dynamic(
  () => import('@/components/AccountManager').then((mod) => ({ default: mod.AccountManager })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-sm flex justify-center">
        <Skeleton className="h-9 w-[140px] rounded-md" />
      </div>
    ),
  }
)

const ChartContainerLazy = dynamic(
  () => import('@/components/ui/organisms/chart').then((mod) => ({ default: mod.ChartContainer })),
  { ssr: false }
)

interface NetWorthOverviewProps {
  onAddAccount?: () => void
}

type TimePeriod = '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL'

const timePeriods: { value: TimePeriod; label: string }[] = [
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '1Y', label: '1Y' },
  { value: '5Y', label: '5Y' },
  { value: 'ALL', label: 'ALL' },
]

// chartConfig is defined inside NetWorthContent to access translations

function NetWorthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

function getAccountIcon(type: string) {
  switch (type) {
    case 'CASH':
      return <Wallet className="h-4 w-4" />
    case 'BANK':
      return <Banknote className="h-4 w-4" />
    case 'INVESTMENT':
      return <Coins className="h-4 w-4" />
    case 'CREDIT_CARD':
      return <CreditCard className="h-4 w-4" />
    case 'PROPERTY':
      return <Home className="h-4 w-4" />
    case 'VEHICLE':
      return <Car className="h-4 w-4" />
    case 'MORTGAGE':
      return <Landmark className="h-4 w-4" />
    default:
      return <Wallet className="h-4 w-4" />
  }
}

function AccountRow({
  account,
}: {
  account: {
    name: string
    type: string
    currency?: string
    currentBalance: number
    currentBalanceInBase?: number
    baseCurrency?: string
    created_at?: string
  }
}) {
  const t = useTranslations('dashboard.netWorth')
  const currency = account.currency || 'IDR'
  const base = account.baseCurrency || 'IDR'
  const showConversion = currency !== base && account.currentBalanceInBase !== undefined

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-full border bg-muted shrink-0 text-muted-foreground">
          {getAccountIcon(account.type)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{account.name}</p>
          <p className="text-xs text-muted-foreground">
            {t('added')}{' '}
            {account.created_at
              ? formatDistanceToNow(new Date(account.created_at), { addSuffix: true })
              : t('recently')}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        <span className="text-sm font-medium tabular-nums">
          {formatCurrency(Math.abs(account.currentBalance), currency)}
        </span>
        {showConversion && (
          <p className="text-xs text-muted-foreground tabular-nums">
            ≈ {formatCurrency(Math.abs(account.currentBalanceInBase!), base)}
          </p>
        )}
      </div>
    </div>
  )
}

function CategoryGroup({
  category,
  isLiability,
}: {
  category: AccountCategory
  isLiability: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: category.color }}
          />
          <span className="text-sm font-semibold">{category.name}</span>
          {!isLiability && (
            <span className="text-xs text-muted-foreground">
              {Math.round(category.percentage)}%
            </span>
          )}
        </div>
        <span className={cn('text-sm font-semibold tabular-nums', isLiability ? 'text-destructive' : '')}>
          {formatCurrencyCompact(Math.abs(category.total))}
        </span>
      </div>
      <div className="space-y-0.5 pl-4 border-l border-border/50">
        {category.accounts.map((account, i) => (
          <AccountRow key={i} account={account} />
        ))}
      </div>
    </div>
  )
}

function NetWorthContent({ onAddAccount }: NetWorthOverviewProps) {
  const { user } = useAuth()
  const t = useTranslations('dashboard.netWorth')
  const userId = user?.id || ''
  const { accounts, loading: accountsLoading, error: accountsError } = useAccounts()
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1Y')
  const [netWorthData, setNetWorthData] = useState<NetWorthResponse | null>(null)
  const [accountCategories, setAccountCategories] = useState<AccountCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const chartConfig = {
    value: {
      label: t('netWorth'),
      color: 'hsl(var(--chart-1))',
    },
  }

  const refreshNetWorth = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await fetchNetWorthData(userId, selectedPeriod)
      setNetWorthData(data)

      const assetOwned = data.accounts?.length
        ? data.accounts
        : (accounts?.map((a) => ({ ...a, currentBalance: a.currentBalance ?? a.balance ?? 0 })) ?? [])

      setAccountCategories(categorizeAccounts(assetOwned))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load net worth data')
    } finally {
      setLoading(false)
    }
  }, [userId, selectedPeriod, accounts])

  useEffect(() => {
    startTransition(() => {
      refreshNetWorth()
    })
  }, [refreshNetWorth])

  const isLoading = loading || accountsLoading || isPending
  const netWorthChange = netWorthData
    ? getNetWorthChange(netWorthData.netWorthData)
    : { amount: 0, percentage: 0 }
  const isPositiveChange = netWorthChange.amount >= 0

  const liabilityAccountTypes = new Set(['CREDIT_CARD', 'MORTGAGE'])
  const isLiabilityCategory = (category: AccountCategory) =>
    category.accounts.some((account) => liabilityAccountTypes.has(account.type)) ||
    category.total < 0
  const assetCategories = accountCategories.filter((cat) => !isLiabilityCategory(cat))
  const liabilityCategories = accountCategories.filter((cat) => isLiabilityCategory(cat))
  const assetsTotal = assetCategories.reduce((sum, cat) => sum + Math.max(0, cat.total), 0)
  const liabilitiesTotal = Math.abs(
    liabilityCategories.reduce((sum, cat) => sum + Math.min(0, cat.total), 0)
  )
  const netWorthSummary = netWorthData?.currentNetWorth ?? assetsTotal - liabilitiesTotal
  const baseCurrency = netWorthData?.accounts?.[0]?.baseCurrency ?? 'IDR'

  const periodLabel =
    selectedPeriod === 'ALL'
      ? t('periods.allTime')
      : selectedPeriod === '1W'
        ? t('periods.lastWeek')
        : selectedPeriod === '1M'
          ? t('periods.lastMonth')
          : selectedPeriod === '3M'
            ? t('periods.last3Months')
            : selectedPeriod === '1Y'
              ? t('periods.lastYear')
              : t('periods.last5Years')

  if ((error || accountsError) && !netWorthData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40 text-destructive text-sm">
            {error || accountsError}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isLoading && !netWorthData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            {t('noData')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full space-y-2">
      {/* ── Main card: header + chart + summary stats ── */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Net Worth Value */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('totalNetWorth')}
              </p>
              {isLoading ? (
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-9 w-44" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : netWorthData ? (
                <>
                  <p className="text-2xl font-bold tracking-tight">
                    {formatCurrency(netWorthData.currentNetWorth)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Base currency: {baseCurrency}
                  </p>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-sm font-medium',
                      isPositiveChange ? 'text-success' : 'text-destructive'
                    )}
                  >
                    {isPositiveChange ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    <span>{formatCurrencyCompact(Math.abs(netWorthChange.amount))}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({Math.abs(netWorthChange.percentage).toFixed(1)}%){' '}
                      {periodLabel}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>

        {/* Chart */}
        <CardContent>
        <div className="h-[220px] mt-4">
          {isLoading ? (
            <div className="h-full px-6">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="h-full px-6">
                  <Skeleton className="h-full w-full rounded-lg" />
                </div>
              }
            >
              <ChartContainerLazy config={chartConfig} className="h-full w-full">
                <AreaChart
                  data={netWorthData?.netWorthData ?? []}
                  margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={40}
                    interval="preserveStartEnd"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    padding={{ left: 0, right: 32 }}
                  />
                  <Tooltip
                    content={<NetWorthTooltip />}
                    cursor={{
                      stroke: 'hsl(var(--border))',
                      strokeWidth: 1,
                      strokeDasharray: '4 2',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fill="url(#netWorthGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      strokeWidth: 2,
                      stroke: 'hsl(var(--background))',
                      fill: 'hsl(var(--chart-1))',
                    }}
                  />
                </AreaChart>
              </ChartContainerLazy>
            </Suspense>
          )}
        </div>
        {/* Period Selector */}
            <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-1 self-start justify-center px-auto">
              {timePeriods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  disabled={isLoading}
                  className={cn(
                    'px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 disabled:opacity-50',
                    selectedPeriod === period.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {period.label}
                </button>
              ))}
            </div>
        </CardContent>

        {/* Summary Stats */}
        <CardFooter>
        <div className="grid grid-cols-3 divide-x mb-2">
          <div className="px-3 py-3 sm:px-6">
            <p className="text-xs text-muted-foreground mb-1">{t('netWorth')}</p>
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <p className="text-sm font-bold tabular-nums">
                {formatCurrencyCompact(netWorthSummary)}
              </p>
            )}
          </div>
          <div className="px-3 py-3 sm:px-6">
            <p className="text-xs text-muted-foreground mb-1">{t('assets')}</p>
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <p className="text-sm font-bold text-success tabular-nums">
                {formatCurrencyCompact(assetsTotal)}
              </p>
            )}
          </div>
          <div className="px-3 py-3 sm:px-6">
            <p className="text-xs text-muted-foreground mb-1">{t('liabilities')}</p>
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <p className="text-sm font-bold text-destructive tabular-nums">
                {formatCurrencyCompact(liabilitiesTotal)}
              </p>
            )}
          </div>
          </div>
           {/* ── Account Manager ── */}
            <div className="flex justify-center">
              <Suspense
                fallback={
                  <div className="w-full max-w-sm flex justify-center">
                    <Skeleton className="h-9 w-[140px] rounded-md" />
                  </div>
                }
              >
                <AccountManagerLazy
                  onAccountUpdated={() => {
                    startTransition(() => {
                      refreshNetWorth()
                    })
                    onAddAccount?.()
                  }}
                  className="w-full max-w-sm"
                />
              </Suspense>
            </div>
        </CardFooter>
      </Card>

      {/* ── Account Breakdown ── */}
      <div className="flex flex-col gap-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:auto-rows-fr">
        {/* Assets */}
        <Card className="h-full">
          <CardHeader className="pb-3 pt-3 px-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{t('assets')}</h3>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <span className="text-sm font-semibold text-success">
                  {formatCurrency(assetsTotal)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-5 pb-5">
            {isLoading ? (
              <div className="space-y-5">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="pl-4 space-y-2.5">
                      {[1, 2].map((j) => (
                        <div key={j} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-3.5 w-24" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : assetCategories.length > 0 ? (
              <div className="space-y-5">
                {assetCategories.map((category, i) => (
                  <CategoryGroup key={i} category={category} isLiability={false} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noAssetsRecorded')}</p>
            )}
          </CardContent>
        </Card>

        {/* Liabilities */}
        <Card className="h-full">
          <CardHeader className="pb-3 pt-3 px-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{t('liabilities')}</h3>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <span className="text-sm font-semibold text-destructive">
                  {formatCurrency(liabilitiesTotal)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-5 pb-5">
            {isLoading ? (
              <div className="space-y-5">
                {[1].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="pl-4 space-y-2.5">
                      {[1].map((j) => (
                        <div key={j} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-3.5 w-24" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : liabilityCategories.length > 0 ? (
              <div className="space-y-5">
                {liabilityCategories.map((category, i) => (
                  <CategoryGroup key={i} category={category} isLiability={true} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noLiabilitiesRecorded')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function NetWorthOverview({ onAddAccount }: NetWorthOverviewProps) {
  return <NetWorthContent onAddAccount={onAddAccount} />
}
