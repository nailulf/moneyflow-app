"use client"

import type { ReactElement } from "react"
import { useTranslations } from "next-intl"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/organisms/sheet"
import { ScenarioComparison } from "@/components/features/forecast/ScenarioComparison"
import type { ComparisonRow } from "@/lib/forecast/types"

interface ScenarioCompareSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: ComparisonRow[]
  selectedScenarioId: string | null
}

export function ScenarioCompareSheet({
  open,
  onOpenChange,
  rows,
  selectedScenarioId,
}: ScenarioCompareSheetProps): ReactElement {
  const t = useTranslations("forecast.root")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-card data-[side=bottom]:h-auto data-[side=bottom]:max-h-[90dvh] gap-0 p-0"
      >
        <SheetHeader className="shrink-0 space-y-0 px-4 pt-3">
          <SheetTitle>{t("compareTitle")}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <ScenarioComparison rows={rows} selectedScenarioId={selectedScenarioId} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
