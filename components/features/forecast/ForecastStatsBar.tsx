"use client"

import type { ReactElement } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/molecules/card"
import { formatCurrency } from "@/lib/data-utils"
import type { ProjectionPoint } from "@/lib/forecast/types"

interface ForecastStatsBarProps {
  netWorth: number | null
  projection: ProjectionPoint[] | null
  successRate: number | null
  cashflowMonthsUsed: number
}

export function ForecastStatsBar({
  netWorth,
  projection,
  successRate,
  cashflowMonthsUsed,
}: ForecastStatsBarProps): ReactElement {
  const finalPoint = projection?.[projection.length - 1]

  return (
    <Card className="rounded-lg shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Wealth Forecast</CardTitle>
        <CardDescription>
          Model your net worth trajectory with scenarios, events, and market risk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs text-muted-foreground">Current Net Worth</p>
            <p className="text-lg font-semibold">
              {netWorth !== null ? formatCurrency(netWorth) : "\u2014"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs text-muted-foreground">Median Outcome</p>
            <p className="text-lg font-semibold">
              {finalPoint ? formatCurrency(finalPoint.p50) : "\u2014"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs text-muted-foreground">Downside (P10)</p>
            <p className="text-lg font-semibold text-destructive">
              {finalPoint ? formatCurrency(finalPoint.p10) : "\u2014"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className={`text-lg font-semibold ${successRate !== null && successRate >= 70 ? "text-success" : successRate !== null && successRate < 50 ? "text-destructive" : ""}`}>
              {successRate !== null ? `${successRate}%` : "\u2014"}
            </p>
            {cashflowMonthsUsed > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Cashflow: {cashflowMonthsUsed}-mo median
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
