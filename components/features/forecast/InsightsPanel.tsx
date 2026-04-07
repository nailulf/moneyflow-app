"use client"

import type { ReactElement } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/molecules/card"

interface InsightsPanelProps {
  insights: string[]
}

export function InsightsPanel({ insights }: InsightsPanelProps): ReactElement {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Insights</CardTitle>
        <CardDescription>Signals based on the current scenario.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {insights.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
