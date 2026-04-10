"use client"

import type { ReactElement } from "react"
import { ChevronRight, Sparkles } from "lucide-react"

interface ForecastSummaryProps {
  insights: string[]
}

export function ForecastSummary({ insights }: ForecastSummaryProps): ReactElement {
  if (insights.length === 0) return <></>

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Summary</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {insights.join(" ")}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
    </div>
  )
}
