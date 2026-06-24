"use client"

import type { ReactElement } from "react"
import { useTranslations } from "next-intl"
import { Check } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/organisms/sheet"
import { cn } from "@/lib/utils"
import type { ForecastScenario } from "@/lib/forecast/types"

interface ForecastScenarioSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scenarios: ForecastScenario[]
  selectedScenarioId: string | null
  onSelect: (id: string) => void
}

export function ForecastScenarioSheet({
  open,
  onOpenChange,
  scenarios,
  selectedScenarioId,
  onSelect,
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
        <SheetHeader className="shrink-0">
          <SheetTitle>{t("scenarios")}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          {scenarios.map((scenario) => {
            const isSelected = scenario.id === selectedScenarioId
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => handleSelect(scenario.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/50",
                  isSelected && "bg-selected"
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-md leading-body-lg text-foreground">
                    {scenario.name}
                  </span>
                  {scenario.is_default && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-nano font-medium uppercase tracking-wide text-muted-foreground">
                      {t("defaultScenario")}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
