"use client"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export type RootChartView = "net-worth" | "cash-flow"

export function ForecastViewToggle({ value, onChange }: { value: RootChartView; onChange: (v: RootChartView) => void }) {
  const t = useTranslations("forecast.root")
  const segs: { v: RootChartView; label: string }[] = [
    { v: "net-worth", label: t("netWorth") },
    { v: "cash-flow", label: t("cashFlow") },
  ]
  return (
    <div className="flex gap-1 rounded-xl bg-muted p-1">
      {segs.map(s => (
        <button
          key={s.v}
          type="button"
          onClick={() => onChange(s.v)}
          className={cn(
            "flex-1 rounded-[9px] py-2 text-sm font-medium transition-colors",
            value === s.v ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
