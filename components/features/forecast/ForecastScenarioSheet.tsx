"use client"

import type { ReactElement } from "react"
import { useTranslations } from "next-intl"
import { Check, Plus, BarChart3 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/organisms/sheet"
import { Button } from "@/components/ui/atoms/button"
import { cn } from "@/lib/utils"
import { formatCurrencyCompact } from "@/lib/data-utils"
import type { ComparisonRow } from "@/lib/forecast/types"

interface ForecastScenarioSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: ComparisonRow[]
  selectedScenarioId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onCompare: () => void
}

function badgeClass(rate: number): string {
  if (rate >= 70) return "bg-success/15 text-success"
  if (rate >= 50) return "bg-warning/15 text-warning"
  return "bg-destructive/15 text-destructive"
}

export function ForecastScenarioSheet({
  open,
  onOpenChange,
  rows,
  selectedScenarioId,
  onSelect,
  onNew,
  onCompare,
}: ForecastScenarioSheetProps): ReactElement {
  const t = useTranslations("forecast.root")

  const handleSelect = (id: string) => {
    onSelect(id)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-card data-[side=bottom]:h-auto data-[side=bottom]:max-h-[90dvh] gap-0 p-0"
      >
        <SheetHeader className="shrink-0 flex-row items-center justify-between gap-2 space-y-0">
          <SheetTitle>{t("scenarios")}</SheetTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onNew}
            className="gap-1.5 text-primary"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("new")}
          </Button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-2">
          {rows.map((row) => {
            const isSelected = row.id === selectedScenarioId
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => handleSelect(row.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/50",
                  isSelected && "bg-selected"
                )}
              >
                <Check
                  className={cn(
                    "size-5 shrink-0 text-primary",
                    !isSelected && "invisible"
                  )}
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-md leading-body-lg text-foreground">
                      {row.name}
                    </span>
                    {row.isDefault && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-nano font-medium uppercase tracking-wide text-muted-foreground">
                        {t("defaultScenario")}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs leading-caption text-muted-foreground">
                    {t("projected", {
                      amount: formatCurrencyCompact(row.endValue),
                    })}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    badgeClass(row.successRate)
                  )}
                >
                  {row.successRate}%
                </span>
              </button>
            )
          })}
        </div>
        <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Button
            type="button"
            variant="outline"
            onClick={onCompare}
            className="w-full gap-2"
          >
            <BarChart3 className="size-4" aria-hidden="true" />
            {t("compare")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
