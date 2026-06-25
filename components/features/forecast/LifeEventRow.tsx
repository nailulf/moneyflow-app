"use client"

import type { ReactElement } from "react"
import { useTranslations } from "next-intl"
import type { ForecastEvent } from "@/lib/forecast/types"
import { LIFE_EVENT_CATEGORIES, LIFE_EVENT_COLORS } from "@/lib/forecast/types"
import { formatCurrencyCompact } from "@/lib/data-utils"
import { Switch } from "@/components/ui/atoms/switch"
import { cn } from "@/lib/utils"

interface LifeEventRowProps {
  event: ForecastEvent
  dob?: string | null
  onTap: () => void
  onToggle: (id: string, next: boolean) => void
}

export function LifeEventRow({
  event,
  dob,
  onTap,
  onToggle,
}: LifeEventRowProps): ReactElement {
  const t = useTranslations("forecast.events")

  // Find the category for this event type
  const category = LIFE_EVENT_CATEGORIES.find((c) => c.value === event.event_type)

  // Calculate year and age
  const eventYear = new Date(event.event_date).getFullYear()
  const age = dob ? eventYear - new Date(dob).getFullYear() : null

  // Build subtitle
  const subtitleParts: string[] = [`${eventYear}`]
  if (age !== null) {
    subtitleParts.push(`age ${age}`)
  }
  if (event.event_type === "KIDS" && event.details?.end_age) {
    subtitleParts.push(`until ${event.details.end_age}`)
  }
  const subtitle = subtitleParts.join(" · ")

  // Determine if we should show "/yr" suffix
  const showPerYear =
    event.details?.is_recurring === true || event.event_type === "KIDS"

  // Determine right-side content
  let rightContent: ReactElement | string
  if (event.event_type === "RETIREMENT") {
    rightContent = <span className="text-muted-foreground">{t("incomeStops")}</span>
  } else {
    const amount = formatCurrencyCompact(event.amount)
    rightContent = (
      <div className="text-right">
        <div className="text-destructive">−{amount}</div>
        {showPerYear && <div className="text-xs text-muted-foreground">{t("perYear")}</div>}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card",
        event.is_enabled === false && "opacity-60"
      )}
    >
      {/* Icon circle */}
      {category && (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: LIFE_EVENT_COLORS[event.event_type] }}
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
            <path d={category.icon} />
          </svg>
        </div>
      )}

      {/* Tappable middle section */}
      <button
        type="button"
        onClick={onTap}
        className="flex-1 min-w-0 text-left"
      >
        <div className="font-semibold text-foreground truncate">{event.name}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </button>

      {/* Right side content */}
      <div className="shrink-0">{rightContent}</div>

      {/* Toggle switch */}
      <Switch
        checked={event.is_enabled !== false}
        onCheckedChange={(v) => onToggle(event.id, v)}
        aria-label={`Toggle ${event.name}`}
      />
    </div>
  )
}
