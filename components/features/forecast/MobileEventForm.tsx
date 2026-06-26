"use client"

import { useState, type ReactElement, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Trash2 } from "lucide-react"
import { Input } from "@/components/ui/atoms/input"
import { Button } from "@/components/ui/atoms/button"
import { Switch } from "@/components/ui/atoms/switch"
import { CurrencyInput } from "@/components/ui/atoms/currency-input"
import { CreateFlowHeader } from "@/components/features/accounts/create/CreateFlowHeader"
import { StickyCtaBar } from "@/components/features/budget/StickyCtaBar"
import { formatCurrency } from "@/lib/data-utils"
import { computeAnnualMortgagePayment } from "@/lib/forecast/event-impact"
import { buildEventPayload, type EventFormFields } from "@/lib/forecast/event-payload"
import { LIFE_EVENT_CATEGORIES, LIFE_EVENT_COLORS } from "@/lib/forecast/types"
import type { ForecastEvent, LifeEventCategory } from "@/lib/forecast/types"
import { cn } from "@/lib/utils"

interface MobileEventFormProps {
  eventType: LifeEventCategory
  scenarioId: string
  existingEvent?: ForecastEvent | null
  dob?: string | null
  onSubmit: (payload: {
    scenario_id: string
    name: string
    event_date: string
    event_type: string
    amount: number
    note: string | null
    details: Record<string, unknown>
  }) => Promise<void>
  onUpdate?: (eventId: string, payload: {
    name: string
    event_date: string
    amount: number
    details: Record<string, unknown>
  }) => Promise<void>
  onDelete?: (eventId: string) => Promise<void>
  onBack: () => void
  pending?: boolean
}

const currentYear = new Date().getFullYear()

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback
}

/** A white settings-row card with an optional uppercase section header. */
function SectionCard({ title, children }: { title?: string; children: ReactNode }): ReactElement {
  return (
    <div className="space-y-3">
      {title && (
        <p className="px-1 text-xs leading-caption font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      <div className="rounded-2xl bg-card p-4 shadow-card space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div className="space-y-1.5">
      <p className="text-sm leading-body-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  )
}

export function MobileEventForm({
  eventType,
  scenarioId,
  existingEvent,
  dob,
  onSubmit,
  onUpdate,
  onDelete,
  onBack,
  pending,
}: MobileEventFormProps): ReactElement {
  const t = useTranslations("forecast.events")
  const tCat = useTranslations("forecast.categories")
  const category = LIFE_EVENT_CATEGORIES.find((c) => c.value === eventType)!
  const templateLabel = tCat(`${eventType}.template`)
  const subLabel = tCat(`${eventType}.subLabel`)
  const isEdit = !!existingEvent
  const details = (existingEvent?.details ?? {}) as Record<string, unknown>

  const [name, setName] = useState(existingEvent?.name ?? templateLabel)
  const [year, setYear] = useState(
    existingEvent ? new Date(existingEvent.event_date).getFullYear() : currentYear + 1,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Category-specific state (ported from EventDetailForm)
  const initialPriceKey = eventType === "VEHICLE" ? "price" : "home_price"
  const [homePrice, setHomePrice] = useState(num(details[initialPriceKey], 0))
  const [paymentType, setPaymentType] = useState<"loan" | "cash">(
    (details.payment_type as "loan" | "cash") ?? "loan",
  )
  const [downPaymentPct, setDownPaymentPct] = useState(num(details.down_payment_pct, 20))
  const [loanTermYears, setLoanTermYears] = useState(num(details.loan_term_years, 30))
  const [interestRate, setInterestRate] = useState(
    typeof details.interest_rate === "number" ? (details.interest_rate as number) * 100 : 6.5,
  )

  const [totalCost, setTotalCost] = useState(num(details.total_cost, 0))
  const [annualCost, setAnnualCost] = useState(num(details.annual_cost, 0))
  const [endAge, setEndAge] = useState(num(details.end_age, 18))
  const [annualTuition, setAnnualTuition] = useState(num(details.annual_tuition, 0))
  const [durationYears, setDurationYears] = useState(num(details.duration_years, 4))

  const [isRecurring, setIsRecurring] = useState(Boolean(details.is_recurring))
  const [recurringYears, setRecurringYears] = useState(num(details.recurring_years, 1))

  const isBusy = isSubmitting || Boolean(pending)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setIsSubmitting(true)
    const fields: EventFormFields = {
      year,
      homePrice,
      paymentType,
      downPaymentPct,
      loanTermYears,
      interestRatePct: interestRate,
      totalCost,
      annualCost,
      endAge,
      annualTuition,
      durationYears,
      isRecurring,
      recurringYears,
    }
    const { amount, details: builtDetails, event_date } = buildEventPayload(eventType, fields)

    try {
      if (isEdit && existingEvent && onUpdate) {
        await onUpdate(existingEvent.id, { name, event_date, amount, details: builtDetails })
      } else {
        await onSubmit({
          scenario_id: scenarioId,
          name,
          event_type: eventType,
          note: null,
          event_date,
          amount,
          details: builtDetails,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mortgage preview
  const principal = homePrice * (1 - downPaymentPct / 100)
  const monthlyMortgage = principal > 0 && interestRate > 0 && loanTermYears > 0
    ? computeAnnualMortgagePayment(principal, interestRate / 100, loanTermYears) / 12
    : 0

  const ageThen = dob ? year - new Date(dob).getFullYear() : null
  const isVehicleOrProperty = eventType === "PROPERTY" || eventType === "VEHICLE"
  const loanTermOptions = eventType === "PROPERTY" ? [15, 20, 25, 30] : [3, 4, 5, 7]

  return (
    <div className="flex min-h-full flex-col">
      <CreateFlowHeader
        title={templateLabel}
        onBack={onBack}
        backLabel={t("back")}
        formId="event-form"
        saveLabel={t("save")}
        pending={isBusy}
      />

      <form id="event-form" onSubmit={handleSubmit} className="flex-1 space-y-5 pt-2">
        {/* Category summary card */}
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: LIFE_EVENT_COLORS[eventType] }}
          >
            <svg
              width={20}
              height={20}
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
          <div className="min-w-0">
            <p className="text-md leading-body-lg font-semibold text-foreground">{templateLabel}</p>
            <p className="text-sm leading-body-sm text-muted-foreground">{subLabel}</p>
          </div>
        </div>

        {/* Event name */}
        <SectionCard>
          <Field label={t("eventTitle")}>
            <Input
              data-testid="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </SectionCard>

        {/* WHEN */}
        <SectionCard title={t("whenSection")}>
          <Field label={eventType === "PROPERTY" ? t("purchaseYear") : t("year")}>
            <Input
              data-testid="event-year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={currentYear}
            />
          </Field>
          {ageThen !== null && (
            <Field label={t("ageThen")}>
              <Input value={ageThen} readOnly disabled data-testid="event-age-then" />
            </Field>
          )}
        </SectionCard>

        {/* DETAILS */}
        {eventType !== "RETIREMENT" && (
          <SectionCard title={t("detailsSection")}>
            {isVehicleOrProperty && (
              <>
                <Field label={eventType === "PROPERTY" ? t("homePrice") : t("vehiclePrice")}>
                  <CurrencyInput
                    data-testid="event-home-price"
                    value={homePrice}
                    onChange={setHomePrice}
                  />
                </Field>

                <Field label={t("paymentType")}>
                  <div className="flex gap-1 rounded-xl bg-muted p-1">
                    {(["loan", "cash"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        data-testid={`event-payment-${opt}`}
                        onClick={() => setPaymentType(opt)}
                        className={cn(
                          "flex-1 rounded-[9px] py-2 text-sm font-medium transition-colors",
                          paymentType === opt
                            ? "bg-card text-foreground shadow-card"
                            : "text-muted-foreground",
                        )}
                      >
                        {opt === "loan" ? t("loan") : t("cash")}
                      </button>
                    ))}
                  </div>
                </Field>

                {paymentType === "loan" && (
                  <>
                    <Field label={t("downPayment")}>
                      <Input
                        data-testid="event-down-payment"
                        type="number"
                        value={downPaymentPct}
                        onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                        min={0}
                        max={100}
                      />
                    </Field>
                    <Field label={t("loanTerm")}>
                      <div className="flex flex-wrap gap-2">
                        {loanTermOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            data-testid={`event-loan-term-${opt}`}
                            onClick={() => setLoanTermYears(opt)}
                            className={cn(
                              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                              loanTermYears === opt
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {t("years", { n: opt })}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label={t("interestRate")}>
                      <Input
                        data-testid="event-interest-rate"
                        type="number"
                        step="0.1"
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        min={0}
                      />
                    </Field>
                    {monthlyMortgage > 0 && (
                      <div className="rounded-xl bg-muted/50 px-4 py-3">
                        <p className="text-xs leading-caption text-muted-foreground">
                          {t("estMonthlyPayment")}
                        </p>
                        <p className="text-md leading-body-lg font-semibold text-foreground">
                          {formatCurrency(monthlyMortgage)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {(eventType === "WEDDING" || eventType === "HAJJ") && (
              <Field label={t("totalCost")}>
                <CurrencyInput
                  data-testid="event-total-cost"
                  value={totalCost}
                  onChange={setTotalCost}
                />
              </Field>
            )}

            {eventType === "KIDS" && (
              <>
                <Field label={t("annualCost")}>
                  <CurrencyInput
                    data-testid="event-annual-cost"
                    value={annualCost}
                    onChange={setAnnualCost}
                  />
                  <p className="text-xs leading-caption text-muted-foreground">{t("annualCostHint")}</p>
                </Field>
                <Field label={t("untilAge")}>
                  <Input
                    data-testid="event-end-age"
                    type="number"
                    value={endAge}
                    onChange={(e) => setEndAge(Number(e.target.value))}
                    min={1}
                    max={30}
                  />
                </Field>
              </>
            )}

            {eventType === "EDUCATION" && (
              <>
                <Field label={t("annualTuition")}>
                  <CurrencyInput
                    data-testid="event-annual-tuition"
                    value={annualTuition}
                    onChange={setAnnualTuition}
                  />
                </Field>
                <Field label={t("duration")}>
                  <Input
                    data-testid="event-duration"
                    type="number"
                    value={durationYears}
                    onChange={(e) => setDurationYears(Number(e.target.value))}
                    min={1}
                    max={10}
                  />
                </Field>
              </>
            )}

            {eventType === "OTHER" && (
              <>
                <Field label={t("totalCost")}>
                  <CurrencyInput
                    data-testid="event-total-cost"
                    value={totalCost}
                    onChange={setTotalCost}
                  />
                </Field>
                <div className="flex items-center justify-between">
                  <p className="text-sm leading-body-sm font-medium text-foreground">{t("recurring")}</p>
                  <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                </div>
                {isRecurring && (
                  <Field label={t("numberOfYears")}>
                    <Input
                      data-testid="event-recurring-years"
                      type="number"
                      value={recurringYears}
                      onChange={(e) => setRecurringYears(Number(e.target.value))}
                      min={1}
                    />
                  </Field>
                )}
              </>
            )}
          </SectionCard>
        )}

        {/* Delete */}
        {existingEvent && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(existingEvent.id)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm leading-body-sm font-semibold text-destructive shadow-card"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t("deleteEvent")}
          </button>
        )}
      </form>

      <StickyCtaBar>
        <Button
          type="submit"
          form="event-form"
          disabled={isBusy || !name}
          className="h-[52px] w-full rounded-[14px] text-md leading-body-lg font-semibold"
        >
          {t("saveEvent")}
        </Button>
      </StickyCtaBar>
    </div>
  )
}
