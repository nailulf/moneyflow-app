'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Plus, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  fetchNetWorthData,
  categorizeAccounts,
  getNetWorthChange,
  validatePeriod,
  type NetWorthResponse,
  type AccountCategory
} from '@/lib/net-worth-utils'
import { formatCurrency } from '@/lib/data-utils'

interface NetWorthOverviewProps {
  onAddAccount: () => void
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

export default function NetWorthOverview({ onAddAccount }: NetWorthOverviewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("1M")
  const [netWorthData, setNetWorthData] = useState<NetWorthResponse | null>(null)
  const [accountCategories, setAccountCategories] = useState<AccountCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Mock user ID - in a real app, this would come from authentication
  const userId = "1d16c616-77a6-48de-9a54-dde7845f720d" // TODO: Replace with actual user ID from auth context

  // Fetch net worth data when component mounts or period changes
  useEffect(() => {
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
  }, [userId, selectedPeriod])

  // Calculate change from the data
  const netWorthChange = netWorthData ? getNetWorthChange(netWorthData.netWorthData) : { amount: 0, percentage: 0 }
  const isPositiveChange = netWorthChange.amount >= 0

  if (loading) {
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

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96 text-red-500">
            <span>Error: {error}</span>
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
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="net-worth">Net worth</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Net Worth Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">All</div>
                <div className="text-2xl font-bold">{formatCurrency(netWorthData.currentNetWorth)}</div>
                <div className={cn("flex items-center text-sm", isPositiveChange ? "text-green-600" : "text-red-600")}>
                  {isPositiveChange ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {formatCurrency(Math.abs(netWorthChange.amount))} ({Math.abs(netWorthChange.percentage).toFixed(1)}%)
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Assets</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(accountCategories.reduce((sum, cat) => sum + Math.max(0, cat.total), 0))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Liabilities</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(Math.abs(accountCategories.reduce((sum, cat) => sum + Math.min(0, cat.total), 0)))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Assets</span>
                  <span className="text-lg font-normal">
                    {formatCurrency(accountCategories.reduce((sum, cat) => sum + Math.max(0, cat.total), 0))}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {accountCategories.filter(cat => cat.total > 0).map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category.name} ({category.percentage.toFixed(0)}%)</span>
                      <span className="text-sm">{formatCurrency(category.total)}</span>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                    
                    {/* Individual accounts in this category */}
                    <div className="ml-4 space-y-1">
                      {category.accounts.map((account, accountIndex) => (
                        <div key={accountIndex} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{account.name}</span>
                          <span>{formatCurrency(account.currentBalance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Liabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Liabilities</span>
                  <span className="text-lg font-normal">
                    {formatCurrency(Math.abs(accountCategories.reduce((sum, cat) => sum + Math.min(0, cat.total), 0)))}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {accountCategories.filter(cat => cat.total < 0).map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-sm">{formatCurrency(Math.abs(category.total))}</span>
                    </div>
                    
                    {/* Individual accounts in this category */}
                    <div className="ml-4 space-y-1">
                      {category.accounts.map((account, accountIndex) => (
                        <div key={accountIndex} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{account.name}</span>
                          <span>{formatCurrency(Math.abs(account.currentBalance))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {accountCategories.filter(cat => cat.total < 0).length === 0 && (
                  <div className="text-sm text-muted-foreground">No liabilities</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add Account Button */}
          <div className="flex justify-center">
            <Button onClick={onAddAccount} variant="outline" className="w-full max-w-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add account
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="net-worth" className="space-y-6">
          {/* Chart Section */}
          <Card>
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
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={netWorthData.netWorthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-1))"
                      fill="hsl(var(--chart-1))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}