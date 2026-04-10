"use client"

import { useState, type ReactElement } from "react"
import { Input } from "@/components/ui/atoms/input"
import { Label } from "@/components/ui/atoms/label"
import { Button } from "@/components/ui/atoms/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/molecules/select"
import { Switch } from "@/components/ui/atoms/switch"
import { formatCurrency } from "@/lib/data-utils"
import { computeAnnualMortgagePayment } from "@/lib/forecast/event-impact"
import type { LifeEventCategory } from "@/lib/forecast/types"
import { LIFE_EVENT_CATEGORIES } from "@/lib/forecast/types"

interface EventDetailFormProps {
  eventType: LifeEventCategory
  scenarioId: string
  onSubmit: (payload: {
    scenario_id: string
    name: string
    event_date: string
    event_type: string
    amount: number
    note: string | null
    details: Record<string, unknown>
  }) => Promise<void>
  onBack: () => void
}

const currentYear = new Date().getFullYear()

export function EventDetailForm({ eventType, scenarioId, onSubmit, onBack }: EventDetailFormProps): ReactElement {
  const category = LIFE_EVENT_CATEGORIES.find((c) => c.value === eventType)!
  const [name, setName] = useState(category.templateLabel)
  const [year, setYear] = useState(currentYear + 1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Category-specific state
  const [homePrice, setHomePrice] = useState(0)
  const [paymentType, setPaymentType] = useState<"loan" | "cash">("loan")
  const [downPaymentPct, setDownPaymentPct] = useState(20)
  const [loanTermYears, setLoanTermYears] = useState(30)
  const [interestRate, setInterestRate] = useState(6.5)

  const [totalCost, setTotalCost] = useState(0)
  const [annualCost, setAnnualCost] = useState(0)
  const [endAge, setEndAge] = useState(18)
  const [annualTuition, setAnnualTuition] = useState(0)
  const [durationYears, setDurationYears] = useState(4)

  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringYears, setRecurringYears] = useState(1)

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

    await onSubmit({
      scenario_id: scenarioId,
      name,
      event_date: `${year}-01-01`,
      event_type: eventType,
      amount,
      note: null,
      details,
    })
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
          <span className="font-semibold">{category.templateLabel}</span>
        </div>
      </div>

      {/* Event title */}
      <div className="space-y-1.5">
        <Label>Event title</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* Year */}
      <div className="space-y-1.5">
        <Label>{eventType === "PROPERTY" ? "Purchase year" : "Year"}</Label>
        <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={currentYear} />
      </div>

      {/* Category-specific fields */}
      {(eventType === "PROPERTY" || eventType === "VEHICLE") && (
        <>
          <div className="space-y-1.5">
            <Label>{eventType === "PROPERTY" ? "Home price" : "Vehicle price"}</Label>
            <Input type="number" value={homePrice} onChange={(e) => setHomePrice(Number(e.target.value))} min={0} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment type</Label>
            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as "loan" | "cash")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="loan">Loan</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {paymentType === "loan" && (
            <>
              <div className="space-y-1.5">
                <Label>Down payment (%)</Label>
                <Input type="number" value={downPaymentPct} onChange={(e) => setDownPaymentPct(Number(e.target.value))} min={0} max={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Loan term</Label>
                <Select value={String(loanTermYears)} onValueChange={(v) => setLoanTermYears(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {eventType === "PROPERTY" ? (
                      <><SelectItem value="15">15 years</SelectItem><SelectItem value="20">20 years</SelectItem><SelectItem value="25">25 years</SelectItem><SelectItem value="30">30 years</SelectItem></>
                    ) : (
                      <><SelectItem value="3">3 years</SelectItem><SelectItem value="4">4 years</SelectItem><SelectItem value="5">5 years</SelectItem><SelectItem value="7">7 years</SelectItem></>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Interest rate (%)</Label>
                <Input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} min={0} />
              </div>
              {monthlyMortgage > 0 && (
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Estimated monthly payment</p>
                  <p className="text-sm font-semibold">{formatCurrency(monthlyMortgage)}</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {(eventType === "WEDDING" || eventType === "HAJJ") && (
        <div className="space-y-1.5">
          <Label>Total cost</Label>
          <Input type="number" value={totalCost} onChange={(e) => setTotalCost(Number(e.target.value))} min={0} />
        </div>
      )}

      {eventType === "KIDS" && (
        <>
          <div className="space-y-1.5">
            <Label>Annual cost</Label>
            <Input type="number" value={annualCost} onChange={(e) => setAnnualCost(Number(e.target.value))} min={0} />
            <p className="text-xs text-muted-foreground">Estimated yearly cost of raising a child.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Until age</Label>
            <Input type="number" value={endAge} onChange={(e) => setEndAge(Number(e.target.value))} min={1} max={30} />
          </div>
        </>
      )}

      {eventType === "EDUCATION" && (
        <>
          <div className="space-y-1.5">
            <Label>Annual tuition</Label>
            <Input type="number" value={annualTuition} onChange={(e) => setAnnualTuition(Number(e.target.value))} min={0} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (years)</Label>
            <Input type="number" value={durationYears} onChange={(e) => setDurationYears(Number(e.target.value))} min={1} max={10} />
          </div>
        </>
      )}

      {eventType === "OTHER" && (
        <>
          <div className="space-y-1.5">
            <Label>Total cost</Label>
            <Input type="number" value={totalCost} onChange={(e) => setTotalCost(Number(e.target.value))} min={0} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <Label>Recurring</Label>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
          {isRecurring && (
            <div className="space-y-1.5">
              <Label>Number of years</Label>
              <Input type="number" value={recurringYears} onChange={(e) => setRecurringYears(Number(e.target.value))} min={1} />
            </div>
          )}
        </>
      )}

      <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || !name}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </div>
  )
}
