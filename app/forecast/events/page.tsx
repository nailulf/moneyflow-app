"use client"

import { useEffect } from "react"
import type { ReactElement } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import {
  useForecastEvents,
  useToggleEvent,
  useForecastUserDOB,
} from "@/hooks/useForecastQuery"
import { LifeEventRow } from "@/components/features/forecast/LifeEventRow"
import { EventCategoryGrid } from "@/components/features/forecast/EventCategoryGrid"
import { CreateFlowHeader } from "@/components/features/accounts/create/CreateFlowHeader"

export default function EventsPage(): ReactElement {
  const t = useTranslations("forecast.events")
  const router = useRouter()
  const scenarioId = useSearchParams().get("scenario")
  const { data: events = [] } = useForecastEvents(scenarioId)
  const { data: dob } = useForecastUserDOB()
  const toggle = useToggleEvent(scenarioId)

  useEffect(() => {
    if (!scenarioId) router.replace("/forecast")
  }, [scenarioId, router])

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-3 pb-10">
      <CreateFlowHeader
        title={t("listTitle")}
        onBack={() => router.back()}
        backLabel={t("back")}
      />

      <button
        type="button"
        onClick={() =>
          router.push(`/forecast/events/new?scenario=${scenarioId}`)
        }
        className="flex items-center gap-1.5 self-end rounded-full bg-primary px-4 py-2 text-sm leading-none font-semibold text-primary-foreground"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t("add")}
      </button>

      {events.length === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="px-1 text-sm text-muted-foreground">
            {t("emptyPrompt")}
          </p>
          <EventCategoryGrid
            onSelect={(type) =>
              router.push(
                `/forecast/events/new?scenario=${scenarioId}&type=${type}`
              )
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <LifeEventRow
              key={e.id}
              event={e}
              dob={dob ?? null}
              onTap={() => router.push(`/forecast/events/${e.id}`)}
              onToggle={(id, next) =>
                toggle.mutateAsync({ eventId: id, is_enabled: next })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
