"use client"

import type { Dispatch, ReactElement, SetStateAction } from "react"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/organisms/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/molecules/tabs"
import { Button } from "@/components/ui/atoms/button"
import type { ForecastScenario, ForecastEvent, ScenarioDraft } from "@/lib/forecast/types"
import { EventSchedule } from "./EventSchedule"
import { ScenarioSettings } from "./ScenarioSettings"

interface CustomizeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: "settings" | "events"
  // Scenario props
  scenarios: ForecastScenario[]
  selectedScenarioId: string | null
  scenarioDraft: ScenarioDraft | null
  isSaving: boolean
  monthlyCashflow: number
  cashflowMonthsUsed: number
  computedCAGR: number | null
  onSelectScenario: (id: string) => void
  onDraftChange: Dispatch<SetStateAction<ScenarioDraft | null>>
  onSave: () => void
  onCreate: () => void
  onDuplicate: () => void
  onDelete: () => void
  // Event props
  events: ForecastEvent[]
  onEventSubmit: (payload: {
    scenario_id: string
    name: string
    event_date: string
    event_type: string
    amount: number
    note: string | null
    details?: Record<string, unknown>
  }) => Promise<void>
  onEventUpdate?: (eventId: string, payload: {
    name: string
    event_date: string
    amount: number
    details: Record<string, unknown>
  }) => Promise<void>
  onEventDelete: (eventId: string) => Promise<void>
  onEventToggle?: (eventId: string, is_enabled: boolean) => Promise<void>
}

export function CustomizeSheet({
  open,
  onOpenChange,
  initialTab,
  scenarios,
  selectedScenarioId,
  scenarioDraft,
  isSaving,
  monthlyCashflow,
  cashflowMonthsUsed,
  computedCAGR,
  onSelectScenario,
  onDraftChange,
  onSave,
  onCreate,
  onDuplicate,
  onDelete,
  events,
  onEventSubmit,
  onEventUpdate,
  onEventDelete,
  onEventToggle,
}: CustomizeSheetProps): ReactElement {
  const t = useTranslations("forecast.customize")
  const [activeTab, setActiveTab] = useState<"settings" | "events">(initialTab ?? "events")
  useEffect(() => {
    if (open) setActiveTab(initialTab ?? "events")
  }, [open, initialTab])
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>
            {t("description")}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "settings" | "events")} className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="events" className="flex-1">{t("tabEvents")}</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">{t("tabSettings")}</TabsTrigger>
            </TabsList>
            <TabsContent value="events" className="mt-4">
              <EventSchedule
                events={events}
                selectedScenarioId={selectedScenarioId}
                onSubmit={onEventSubmit}
                onUpdate={onEventUpdate}
                onDelete={onEventDelete}
                onToggle={onEventToggle}
              />
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
              <ScenarioSettings
                scenarios={scenarios}
                selectedScenarioId={selectedScenarioId}
                scenarioDraft={scenarioDraft}
                isSaving={isSaving}
                monthlyCashflow={monthlyCashflow}
                cashflowMonthsUsed={cashflowMonthsUsed}
                computedCAGR={computedCAGR}
                onSelectScenario={onSelectScenario}
                onDraftChange={onDraftChange}
                onSave={onSave}
                onCreate={onCreate}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
