"use client"

import { useState, type ReactElement } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/molecules/card"
import { Input } from "@/components/ui/atoms/input"
import { Label } from "@/components/ui/atoms/label"
import { Button } from "@/components/ui/atoms/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/molecules/select"
import { formatCurrency } from "@/lib/data-utils"
import type { ForecastEvent, LifeEventCategory } from "@/lib/forecast/types"
import { LIFE_EVENT_CATEGORIES } from "@/lib/forecast/types"

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
  }) => Promise<void>
  onDelete: (eventId: string) => Promise<void>
}

export function EventSchedule({
  events,
  selectedScenarioId,
  onSubmit,
  onDelete,
}: EventScheduleProps): ReactElement {
  const [eventForm, setEventForm] = useState({
    name: "",
    event_date: new Date().toISOString().split("T")[0],
    event_type: "OTHER" as LifeEventCategory,
    amount: 0,
    note: "",
  })

  const handleSubmit = async () => {
    if (!selectedScenarioId || !eventForm.name) return
    await onSubmit({
      scenario_id: selectedScenarioId,
      name: eventForm.name,
      event_date: eventForm.event_date,
      event_type: eventForm.event_type,
      amount: Number(eventForm.amount),
      note: eventForm.note || null,
    })
    setEventForm((prev) => ({ ...prev, name: "", amount: 0, note: "" }))
  }

  const getCategoryLabel = (type: string) =>
    LIFE_EVENT_CATEGORIES.find((c) => c.value === type)?.label ?? type

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Life Events</CardTitle>
        <CardDescription>Plan major expenses that affect your forecast.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              placeholder="e.g., Buy apartment, Wedding"
              value={eventForm.name}
              onChange={(e) => setEventForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-category">Category</Label>
            <Select
              value={eventForm.event_type}
              onValueChange={(value) => setEventForm((prev) => ({ ...prev, event_type: value as LifeEventCategory }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {LIFE_EVENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-date">Date</Label>
            <Input
              id="event-date"
              type="date"
              value={eventForm.event_date}
              onChange={(e) => setEventForm((prev) => ({ ...prev, event_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-amount">Amount (today&apos;s money)</Label>
            <Input
              id="event-amount"
              type="number"
              min={0}
              value={eventForm.amount}
              onChange={(e) => setEventForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground">
              Cost in today&apos;s terms. Inflation-adjusted automatically in the projection.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-note">Note</Label>
            <Input
              id="event-note"
              value={eventForm.note}
              onChange={(e) => setEventForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!eventForm.name || eventForm.amount <= 0}>
            Add Event
          </Button>
          <div className="space-y-2">
            {events.length === 0 && (
              <p className="text-xs text-muted-foreground">No life events planned.</p>
            )}
            {events.map((eventItem) => (
              <div
                key={eventItem.id}
                className="flex items-start justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{eventItem.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {getCategoryLabel(eventItem.event_type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(eventItem.event_date), "dd MMM yyyy")}
                    </span>
                  </div>
                  <p className="text-sm text-destructive">{formatCurrency(Number(eventItem.amount))}</p>
                  {eventItem.note && (
                    <p className="text-xs text-muted-foreground">{eventItem.note}</p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(eventItem.id)}
                >
                  &times;
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
