"use client"

import { useEffect, type ReactElement } from "react"
import { useParams, useRouter } from "next/navigation"
import { MobileEventForm } from "@/components/features/forecast/MobileEventForm"
import {
  useDeleteEvent,
  useForecastEvents,
  useForecastScenarios,
  useForecastUserDOB,
  useUpdateEvent,
} from "@/hooks/useForecastQuery"

export default function EditEventPage(): ReactElement | null {
  const router = useRouter()
  const id = useParams().id as string
  const { data: scenarios = [] } = useForecastScenarios()
  const defaultScenarioId = (scenarios.find((s) => s.is_default) ?? scenarios[0])?.id ?? null
  const { data: events = [] } = useForecastEvents(defaultScenarioId)
  const { data: dob } = useForecastUserDOB()
  const event = events.find((e) => e.id === id)
  const update = useUpdateEvent(event?.scenario_id ?? null)
  const del = useDeleteEvent(event?.scenario_id ?? null)

  useEffect(() => {
    if (scenarios.length > 0 && events.length > 0 && !event) {
      router.replace("/forecast/events")
    }
  }, [scenarios, events, event, router])

  if (!event) return null

  return (
    <MobileEventForm
      eventType={event.event_type}
      scenarioId={event.scenario_id}
      existingEvent={event}
      dob={dob ?? null}
      pending={update.isPending}
      onBack={() => router.back()}
      onSubmit={async () => {}}
      onUpdate={async (eventId, payload) => {
        await update.mutateAsync({ eventId, ...payload })
        router.back()
      }}
      onDelete={async (eventId) => {
        await del.mutateAsync(eventId)
        router.back()
      }}
    />
  )
}
