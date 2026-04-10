"use client"

import { useState, type ReactElement } from "react"
import { format } from "date-fns"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/atoms/button"
import { Switch } from "@/components/ui/atoms/switch"
import { formatCurrency } from "@/lib/data-utils"
import type { ForecastEvent, LifeEventCategory } from "@/lib/forecast/types"
import { LIFE_EVENT_CATEGORIES, LIFE_EVENT_COLORS } from "@/lib/forecast/types"
import { EventDetailForm } from "./EventDetailForm"

interface EventScheduleProps {
  events: ForecastEvent[]
  selectedScenarioId: string | null
  onSubmit: (payload: {
    scenario_id: string
    name: string
    event_date: string
    event_type: string
    amount: number
    note: string | null
    details?: Record<string, unknown>
  }) => Promise<void>
  onDelete: (eventId: string) => Promise<void>
  onToggle?: (eventId: string, is_enabled: boolean) => Promise<void>
}

export function EventSchedule({
  events,
  selectedScenarioId,
  onSubmit,
  onDelete,
  onToggle,
}: EventScheduleProps): ReactElement {
  const [selectedTemplate, setSelectedTemplate] = useState<LifeEventCategory | null>(null)

  if (selectedTemplate && selectedScenarioId) {
    return (
      <EventDetailForm
        eventType={selectedTemplate}
        scenarioId={selectedScenarioId}
        onSubmit={async (payload) => {
          await onSubmit(payload)
          setSelectedTemplate(null)
        }}
        onBack={() => setSelectedTemplate(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Your events */}
      {events.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Your events</p>
          <div className="space-y-1">
            {events.map((event) => {
              const cat = LIFE_EVENT_CATEGORIES.find((c) => c.value === event.event_type)
              const color = LIFE_EVENT_COLORS[event.event_type as LifeEventCategory] ?? "hsl(var(--muted-foreground))"
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: color }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d={cat?.icon ?? ""} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.event_date), "yyyy")}
                      {event.amount > 0 && ` · ${formatCurrency(event.amount)}`}
                    </p>
                  </div>
                  {onToggle && (
                    <Switch
                      checked={event.is_enabled !== false}
                      onCheckedChange={(checked) => onToggle(event.id, checked)}
                      className="shrink-0"
                    />
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => onDelete(event.id)}
                  >
                    &times;
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add event templates */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Add event</p>
        <div className="space-y-0.5">
          {LIFE_EVENT_CATEGORIES.map((cat) => {
            const color = LIFE_EVENT_COLORS[cat.value] ?? "hsl(var(--muted-foreground))"
            return (
              <button
                key={cat.value}
                type="button"
                className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setSelectedTemplate(cat.value)}
              >
                <div className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: color }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={cat.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium flex-1">{cat.templateLabel}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
