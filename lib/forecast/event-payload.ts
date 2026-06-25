import type { LifeEventCategory } from "@/lib/forecast/types"

export interface EventFormFields {
  year: number; homePrice: number; paymentType: "loan" | "cash"; downPaymentPct: number
  loanTermYears: number; interestRatePct: number; totalCost: number; annualCost: number
  endAge: number; annualTuition: number; durationYears: number; isRecurring: boolean; recurringYears: number
}
export interface EventPayload { amount: number; details: Record<string, unknown>; event_date: string }

export function buildEventPayload(eventType: LifeEventCategory, f: EventFormFields): EventPayload {
  let amount = 0
  let details: Record<string, unknown> = {}
  switch (eventType) {
    case "PROPERTY":
      amount = f.paymentType === "cash" ? f.homePrice : f.homePrice * (f.downPaymentPct / 100)
      details = { home_price: f.homePrice, payment_type: f.paymentType, down_payment_pct: f.downPaymentPct, loan_term_years: f.loanTermYears, interest_rate: f.interestRatePct / 100 }
      break
    case "VEHICLE":
      amount = f.paymentType === "cash" ? f.homePrice : f.homePrice * (f.downPaymentPct / 100)
      details = { price: f.homePrice, payment_type: f.paymentType, down_payment_pct: f.downPaymentPct, loan_term_years: f.loanTermYears, interest_rate: f.interestRatePct / 100 }
      break
    case "KIDS":
      amount = f.annualCost * f.endAge
      details = { annual_cost: f.annualCost, end_age: f.endAge }
      break
    case "EDUCATION":
      amount = f.annualTuition * f.durationYears
      details = { annual_tuition: f.annualTuition, duration_years: f.durationYears }
      break
    case "RETIREMENT":
      amount = 0; details = {}
      break
    case "OTHER":
      amount = f.totalCost
      details = { total_cost: f.totalCost, is_recurring: f.isRecurring, recurring_years: f.isRecurring ? f.recurringYears : 1 }
      break
    default: // WEDDING, HAJJ
      amount = f.totalCost; details = { total_cost: f.totalCost }
      break
  }
  return { amount, details, event_date: `${f.year}-01-01` }
}
