"use client"

import type { ReactElement } from "react"
import { Button } from "@/components/ui/atoms/button"

export type ChartView = "net-worth" | "cash-flow" | "success"

interface ChartViewToggleProps {
  value: ChartView
  onChange: (view: ChartView) => void
}

export function ChartViewToggle({ value, onChange }: ChartViewToggleProps): ReactElement {
  const views: { key: ChartView; label: string }[] = [
    { key: "net-worth", label: "Net Worth" },
    { key: "cash-flow", label: "Cash Flow" },
    { key: "success", label: "Success %" },
  ]

  return (
    <div className="inline-flex rounded-lg border border-border/60 p-0.5">
      {views.map((v) => (
        <Button
          key={v.key}
          size="sm"
          variant={value === v.key ? "default" : "ghost"}
          className="h-7 px-3 text-xs"
          onClick={() => onChange(v.key)}
        >
          {v.label}
        </Button>
      ))}
    </div>
  )
}
