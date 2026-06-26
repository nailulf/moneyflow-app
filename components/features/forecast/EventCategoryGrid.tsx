"use client"

import type { ReactElement } from "react"
import { useTranslations } from "next-intl"
import { LIFE_EVENT_CATEGORIES, LIFE_EVENT_COLORS } from "@/lib/forecast/types"
import type { LifeEventCategory } from "@/lib/forecast/types"
import { cn } from "@/lib/utils"

interface EventCategoryGridProps {
  onSelect: (type: LifeEventCategory) => void
}

export function EventCategoryGrid({ onSelect }: EventCategoryGridProps): ReactElement {
  const tCat = useTranslations("forecast.categories")

  return (
    <div className="grid grid-cols-2 gap-3">
      {LIFE_EVENT_CATEGORIES.map((category) => (
        <button
          key={category.value}
          type="button"
          onClick={() => onSelect(category.value)}
          className={cn(
            "rounded-2xl bg-card p-4 shadow-card text-left",
            "transition-all duration-200 hover:shadow-card/50 active:scale-95"
          )}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full mb-3"
            style={{ backgroundColor: LIFE_EVENT_COLORS[category.value] }}
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
          <p className="text-sm font-semibold text-foreground">
            {tCat(`${category.value}.template`)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {tCat(`${category.value}.subLabel`)}
          </p>
        </button>
      ))}
    </div>
  )
}
