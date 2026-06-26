import type { ScenarioDraft, ForecastEvent } from "@/lib/forecast/types"
import { buildEventImpactMap } from "@/lib/forecast/event-impact"
import { getMonthKey } from "@/lib/forecast/engine"

export interface ProjectionInputs {
  eventMap: Map<string, number>
  eventsByMonth: Map<string, string[]>
  eventDetailsByMonth: Map<string, { name: string; type: string; amount: number }[]>
  retirementDateISO: string | null
}

export function buildProjectionInputs(events: ForecastEvent[], draft: ScenarioDraft): ProjectionInputs {
  const startYear = new Date(draft.start_date).getFullYear()
  const eventMap = buildEventImpactMap(events, startYear, draft.horizon_years, draft.inflation_rate)

  const eventsByMonth = new Map<string, string[]>()
  for (const event of events) {
    if (event.is_enabled === false) continue
    const exactKey = getMonthKey(new Date(event.event_date))
    const janKey = `${new Date(event.event_date).getFullYear()}-01`
    for (const key of new Set([exactKey, janKey])) {
      eventsByMonth.set(key, [...(eventsByMonth.get(key) ?? []), event.event_type])
    }
  }

  const eventDetailsByMonth = new Map<string, { name: string; type: string; amount: number }[]>()
  for (const event of events) {
    if (event.is_enabled === false) continue
    const exactKey = getMonthKey(new Date(event.event_date))
    const janKey = `${new Date(event.event_date).getFullYear()}-01`
    for (const key of new Set([exactKey, janKey])) {
      const existing = eventDetailsByMonth.get(key) ?? []
      if (key === janKey && exactKey === janKey && existing.some((e) => e.name === event.name)) continue
      existing.push({ name: event.name, type: event.event_type, amount: Number(event.amount) })
      eventDetailsByMonth.set(key, existing)
    }
  }

  const retEvent = events.find((e) => e.event_type === "RETIREMENT" && e.is_enabled !== false)
  return { eventMap, eventsByMonth, eventDetailsByMonth, retirementDateISO: retEvent ? retEvent.event_date : null }
}
