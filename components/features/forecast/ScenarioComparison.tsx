"use client"

import type { ReactElement } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/molecules/card"
import { formatCurrency } from "@/lib/data-utils"
import type { ComparisonRow } from "@/lib/forecast/types"

interface ScenarioComparisonProps {
  rows: ComparisonRow[]
  selectedScenarioId: string | null
}

export function ScenarioComparison({
  rows,
  selectedScenarioId,
}: ScenarioComparisonProps): ReactElement {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Scenario Comparison</CardTitle>
        <CardDescription>End value and success rate for each scenario.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Add scenarios to compare outcomes.</p>
          )}
          {rows.map((row) => (
            <div
              key={row.id}
              className={`rounded-lg border border-border/60 px-3 py-2 ${
                row.id === selectedScenarioId ? "bg-muted/40" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{row.name}</p>
                <span className="text-xs text-muted-foreground">
                  {row.isDefault ? "Default" : " "}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-sm font-semibold">{formatCurrency(row.endValue)}</p>
                <span className={`text-xs font-medium ${row.successRate >= 70 ? "text-success" : row.successRate < 50 ? "text-destructive" : "text-muted-foreground"}`}>
                  {row.successRate}% success
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
