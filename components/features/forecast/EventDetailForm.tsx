"use client"

import { useState, type ReactElement } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/atoms/input"
import { Label } from "@/components/ui/atoms/label"
import { Button } from "@/components/ui/atoms/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/molecules/select"
import { Switch } from "@/components/ui/atoms/switch"
import { formatCurrency } from "@/lib/data-utils"
import { computeAnnualMortgagePayment } from "@/lib/forecast/event-impact"
import type { ForecastEvent, LifeEventCategory } from "@/lib/forecast/types"
import { LIFE_EVENT_CATEGORIES } from "@/lib/forecast/types"

interface EventDetailFormProps {
  eventType: LifeEventCategory
  scenarioId: string
  existingEvent?: ForecastEvent | null
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
  onBack: () => void
}

const currentYear = new Date().getFullYear()

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback
}

export function EventDetailForm({ eventType, scenarioId, existingEvent, onSubmit, onUpdate, onBack }: EventDetailFormProps): ReactElement {
  const t = useTranslations("forecast.events")
  const tCat = useTranslations("forecast.categories")
  const category = LIFE_EVENT_CATEGORIES.find((c) => c.value === eventType)!
  const templateLabel = tCat(`${eventType}.template`)
  const isEdit = !!existingEvent
  const details = (existingEvent?.details ?? {}) as Record<string, unknown>

  const [name, setName] = useState(existingEvent?.name ?? templateLabel)
  const [year, setYear] = useState(
    existingEvent ? new Date(existingEvent.event_date).getFullYear() : currentYear + 1,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Category-specific state
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

  const handleSubmit = async () => {
    setIsSubmitting(true)
    let amount = 0
    let details: Record<string, unknown> = {}

    switch (eventType) {
      case "PROPERTY":
        amount = paymentType === "cash" ? homePrice : homePrice * (downPaymentPct / 100)
        details = { home_price: homePrice, payment_type: paymentType, down_payment_pct: downPaymentPct, loan_term_years: loanTermYears, interest_rate: interestRate / 100 }
        break
      case "VEHICLE":
        amount = paymentType === "cash" ? homePrice : homePrice * (downPaymentPct / 100)
        details = { price: homePrice, payment_type: paymentType, down_payment_pct: downPaymentPct, loan_term_years: loanTermYears, interest_rate: interestRate / 100 }
        break
      case "KIDS":
        amount = annualCost * endAge
        details = { annual_cost: annualCost, end_age: endAge }
        break
      case "EDUCATION":
        amount = annualTuition * durationYears
        details = { annual_tuition: annualTuition, duration_years: durationYears }
        break
      case "RETIREMENT":
        amount = 0
        details = {}
        break
      case "OTHER":
        amount = totalCost
        details = { total_cost: totalCost, is_recurring: isRecurring, recurring_years: isRecurring ? recurringYears : 1 }
        break
      default: // WEDDING, HAJJ
        amount = totalCost
        details = { total_cost: totalCost }
        break
    }

    if (isEdit && existingEvent && onUpdate) {
      await onUpdate(existingEvent.id, {
        name,
        event_date: `${year}-01-01`,
        amount,
        details,
      })
    } else {
      await onSubmit({
        scenario_id: scenarioId,
        name,
        event_date: `${year}-01-01`,
        event_type: eventType,
        amount,
        note: null,
        details,
      })
    }
    setIsSubmitting(false)
  }

  // Mortgage preview
  const principal = homePrice * (1 - downPaymentPct / 100)
  const monthlyMortgage = principal > 0 && interestRate > 0 && loanTermYears > 0
    ? computeAnnualMortgagePayment(principal, interestRate / 100, loanTermYears) / 12
    : 0

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3 pb-2 border-b border-border/40">
        <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">&larr;</button>
        <div className="flex items-center gap-2">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d={category.icon} />
          </svg>
          <span className="font-semibold">{templateLabel}</span>
        </div>
      </div>

      {/* Event title */}
      <div className="space-y-1.5">
        <Label>{t("eventTitle")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* Year */}
      <div className="space-y-1.5">
        <Label>{eventType === "PROPERTY" ? t("purchaseYear") : t("year")}</Label>
        <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={currentYear} />
      </div>

      {/* Category-specific fields */}
      {(eventType === "PROPERTY" || eventType === "VEHICLE") && (
        <>
          <div className="space-y-1.5">
            <Label>{eventType === "PROPERTY" ? t("homePrice") : t("vehiclePrice")}</Label>
            <Input type="number" value={homePrice} onChange={(e) => setHomePrice(Number(e.target.value))} min={0} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("paymentType")}</Label>
            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as "loan" | "cash")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="loan">{t("loan")}</SelectItem>
                <SelectItem value="cash">{t("cash")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {paymentType === "loan" && (
            <>
              <div className="space-y-1.5">
                <Label>{t("downPayment")}</Label>
                <Input type="number" value={downPaymentPct} onChange={(e) => setDownPaymentPct(Number(e.target.value))} min={0} max={100} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("loanTerm")}</Label>
                <Select value={String(loanTermYears)} onValueChange={(v) => setLoanTermYears(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {eventType === "PROPERTY" ? (
                      <>
                        <SelectItem value="15">{t("years", { n: 15 })}</SelectItem>
                        <SelectItem value="20">{t("years", { n: 20 })}</SelectItem>
                        <SelectItem value="25">{t("years", { n: 25 })}</SelectItem>
                        <SelectItem value="30">{t("years", { n: 30 })}</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="3">{t("years", { n: 3 })}</SelectItem>
                        <SelectItem value="4">{t("years", { n: 4 })}</SelectItem>
                        <SelectItem value="5">{t("years", { n: 5 })}</SelectItem>
                        <SelectItem value="7">{t("years", { n: 7 })}</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("interestRate")}</Label>
                <Input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} min={0} />
              </div>
              {monthlyMortgage > 0 && (
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{t("estMonthlyPayment")}</p>
                  <p className="text-sm font-semibold">{formatCurrency(monthlyMortgage)}</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {(eventType === "WEDDING" || eventType === "HAJJ") && (
        <div className="space-y-1.5">
          <Label>{t("totalCost")}</Label>
          <Input type="number" value={totalCost} onChange={(e) => setTotalCost(Number(e.target.value))} min={0} />
        </div>
      )}

      {eventType === "KIDS" && (
        <>
          <div className="space-y-1.5">
            <Label>{t("annualCost")}</Label>
            <Input type="number" value={annualCost} onChange={(e) => setAnnualCost(Number(e.target.value))} min={0} />
            <p className="text-xs text-muted-foreground">{t("annualCostHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("untilAge")}</Label>
            <Input type="number" value={endAge} onChange={(e) => setEndAge(Number(e.target.value))} min={1} max={30} />
          </div>
        </>
      )}

      {eventType === "EDUCATION" && (
        <>
          <div className="space-y-1.5">
            <Label>{t("annualTuition")}</Label>
            <Input type="number" value={annualTuition} onChange={(e) => setAnnualTuition(Number(e.target.value))} min={0} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("duration")}</Label>
            <Input type="number" value={durationYears} onChange={(e) => setDurationYears(Number(e.target.value))} min={1} max={10} />
          </div>
        </>
      )}

      {eventType === "OTHER" && (
        <>
          <div className="space-y-1.5">
            <Label>{t("totalCost")}</Label>
            <Input type="number" value={totalCost} onChange={(e) => setTotalCost(Number(e.target.value))} min={0} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <Label>{t("recurring")}</Label>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
          {isRecurring && (
            <div className="space-y-1.5">
              <Label>{t("numberOfYears")}</Label>
              <Input type="number" value={recurringYears} onChange={(e) => setRecurringYears(Number(e.target.value))} min={1} />
            </div>
          )}
        </>
      )}

      <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || !name}>
        {isSubmitting ? t("saving") : t("save")}
      </Button>
    </div>
  )
}
