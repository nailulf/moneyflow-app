"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, TrendingUp, TrendingDown } from "lucide-react"
import { formatCurrency } from "@/lib/data-utils"
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { mockNetWorthData, mockAssets, type TimePeriod } from "@/lib/mock-data"

const timePeriods: { value: TimePeriod; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "YTD", label: "YTD" },
  { value: "1Y", label: "1Y" },
  { value: "3Y", label: "3Y" },
  { value: "5Y", label: "5Y" },
]

const chartConfig = {
  value: {
    label: "Net Worth",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface NetWorthCardProps {
  onAddAssets?: () => void
}

export default function NetWorthCard({ onAddAssets }: NetWorthCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("1Y")
  
  // Fallback data in case mock data is not available
  const fallbackData = [
    { date: "Q1", value: 75000 },
    { date: "Q2", value: 82000 },
    { date: "Q3", value: 95000 },
    { date: "Q4", value: 102300 },
  ]
  
  const chartData = mockNetWorthData[selectedPeriod] || fallbackData
  const displayAssets = mockAssets.slice(0, 5)
  
  // Calculate dynamic values based on selected period
  const currentNetWorth = chartData[chartData.length - 1]?.value || 0
  const previousNetWorth = chartData[0]?.value || 0
  const netWorthChange = currentNetWorth - previousNetWorth
  const netWorthChangePercentage = previousNetWorth > 0 ? (netWorthChange / previousNetWorth) * 100 : 0
  const isPositiveChange = netWorthChange >= 0



  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            NET WORTH
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddAssets}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="text-3xl font-bold">
            {formatCurrency(currentNetWorth)}
          </div>
          <div className="flex items-center gap-2">
            {isPositiveChange ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span
              className={`text-sm font-medium ${
                isPositiveChange ? "text-success" : "text-destructive"
              }`}
            >
              {formatCurrency(Math.abs(netWorthChange))} ({formatPercentage(netWorthChangePercentage)})
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Time Period Selector */}
        <div className="flex flex-wrap gap-1">
          {timePeriods.map((period) => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period.value)}
              className="h-8 px-3 text-xs"
            >
              {period.label}
            </Button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-64 w-full min-h-[256px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart 
              data={chartData}
              width={undefined}
              height={undefined}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tickFormatter={(value) => value}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              <Area
                dataKey="value"
                type="natural"
                fill="var(--color-value)"
                fillOpacity={0.4}
                stroke="var(--color-value)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        {/* Assets Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Assets</h3>
            <span className="text-sm text-muted-foreground">
              {formatCurrency(currentNetWorth)}
            </span>
          </div>
          
          {/* Assets Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="h-full flex">
              {displayAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="h-full"
                  style={{
                    width: `${asset.percentage}%`,
                    backgroundColor: asset.color,
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Assets List */}
          <div className="space-y-3">
            {displayAssets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: asset.color }}
                  />
                  <span className="text-sm font-medium">{asset.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(asset.value)}
                  </span>
                  <Badge
                    variant={asset.change >= 0 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {formatPercentage(asset.changePercentage)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}