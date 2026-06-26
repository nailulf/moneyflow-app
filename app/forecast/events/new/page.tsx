"use client"

import { useEffect, useState, type ReactElement } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { CreateFlowHeader } from "@/components/features/accounts/create/CreateFlowHeader"
import { EventCategoryGrid } from "@/components/features/forecast/EventCategoryGrid"
import { MobileEventForm } from "@/components/features/forecast/MobileEventForm"
import { useCreateEvent, useForecastUserDOB } from "@/hooks/useForecastQuery"
import type { LifeEventCategory } from "@/lib/forecast/types"

export default function NewEventPage(): ReactElement | null {
  const t = useTranslations("forecast.events")
  const router = useRouter()
  const sp = useSearchParams()
  const scenarioId = sp.get("scenario")
  const presetType = sp.get("type") as LifeEventCategory | null
  const { data: dob } = useForecastUserDOB()
  const create = useCreateEvent()
  const [eventType, setEventType] = useState<LifeEventCategory | null>(presetType)

  useEffect(() => {
    if (!scenarioId) router.replace("/forecast")
  }, [scenarioId, router])

  if (!scenarioId) return null

  if (!eventType) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-3 pb-10">
        <CreateFlowHeader title={t("addTitle")} onBack={() => router.back()} backLabel={t("back")} />
        <p className="px-1 text-sm text-muted-foreground">{t("whatsComingUp")}</p>
        <EventCategoryGrid onSelect={setEventType} />
      </div>
    )
  }

  return (
    <MobileEventForm
      eventType={eventType}
      scenarioId={scenarioId}
      dob={dob ?? null}
      pending={create.isPending}
      onBack={() => (presetType ? router.back() : setEventType(null))}
      onSubmit={async (payload) => {
        await create.mutateAsync(payload)
        router.back()
      }}
    />
  )
}
