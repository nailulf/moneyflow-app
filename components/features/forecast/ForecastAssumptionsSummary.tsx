"use client"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { toPercent, type ScenarioDraft } from "@/lib/forecast/types"
import { formatCurrencyCompact } from "@/lib/data-utils"
import { cn } from "@/lib/utils"

export function ForecastAssumptionsSummary({ scenarioDraft, onEdit }: { scenarioDraft: ScenarioDraft; onEdit: () => void }) {
  const t = useTranslations("forecast.root")
  const chips: { key: string; label: string; highlight?: boolean }[] = [
    { key: "r", label: t("chipReturn", { v: toPercent(scenarioDraft.expected_annual_return) }) },
    { key: "i", label: t("chipInflation", { v: toPercent(scenarioDraft.inflation_rate) }) },
    { key: "g", label: t("chipIncome", { v: toPercent(scenarioDraft.annual_income_growth) }), highlight: true },
    ...(scenarioDraft.monthly_contribution > 0 ? [{ key: "c", label: t("chipContribute", { amount: formatCurrencyCompact(scenarioDraft.monthly_contribution) }) }] : []),
    { key: "h", label: t("chipHorizon", { n: scenarioDraft.horizon_years }) },
  ]
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t("assumptions")}</h3>
        <button type="button" onClick={onEdit} className="flex items-center gap-0.5 text-sm font-medium text-primary">
          {t("edit")} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map(c => (
          <span key={c.key} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", c.highlight ? "bg-selected text-selected-foreground" : "bg-muted text-muted-foreground")}>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}
