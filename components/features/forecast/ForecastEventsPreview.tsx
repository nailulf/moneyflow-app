"use client"

import type { ReactElement } from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { ChevronRight } from "lucide-react"
import { formatCurrencyCompact } from "@/lib/data-utils"
import type { ForecastEvent, LifeEventCategory } from "@/lib/forecast/types"
import { LIFE_EVENT_CATEGORIES, LIFE_EVENT_COLORS } from "@/lib/forecast/types"

interface ForecastEventsPreviewProps {
  events: ForecastEvent[]
  onManage: () => void
}

export function ForecastEventsPreview({ events, onManage }: ForecastEventsPreviewProps): ReactElement {
  const t = useTranslations("forecast.root")
  const preview = events.slice(0, 3)

  return (
    <div className="rounded-2xl bg-card px-4 shadow-card">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-md font-semibold text-foreground">{t("lifeEvents")}</h2>
        <button
          type="button"
          onClick={onManage}
          className="flex items-center gap-0.5 text-sm font-medium text-primary"
        >
          {t("manage")}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {preview.length === 0 ? (
        <p className="pb-4 text-sm text-muted-foreground">{t("noEvents")}</p>
      ) : (
        <ul>
          {preview.map((event) => {
            const cat = LIFE_EVENT_CATEGORIES.find((c) => c.value === event.event_type)
            const color =
              LIFE_EVENT_COLORS[event.event_type as LifeEventCategory] ?? "hsl(var(--muted-foreground))"
            return (
              <li
                key={event.id}
                className="flex items-center gap-3 border-t border-border py-3"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: color }}
                >
                  <svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={cat?.icon ?? ""} />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{event.name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(event.event_date), "yyyy")}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-destructive">
                  &minus;{formatCurrencyCompact(event.amount)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
