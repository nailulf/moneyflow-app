import { addMonths, format } from "date-fns"
import type {
  ForecastEvent,
  PropertyDetails,
  VehicleDetails,
  KidsDetails,
  EducationDetails,
  OtherDetails,
} from "./types"

type YearlyImpact = { income: number; expense: number }

/**
 * Standard amortization formula for annual payment.
 * M_annual = 12 * P * [r(1+r)^n] / [(1+r)^n - 1]
 * where P = principal, r = monthly interest rate, n = total months
 */
export function computeAnnualMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  if (principal <= 0 || termYears <= 0) return 0
  if (annualRate <= 0) return principal / termYears // zero-interest
  const r = annualRate / 12
  const n = termYears * 12
  const monthlyPayment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  return monthlyPayment * 12
}

/**
 * Expand a single event into per-year income/expense impacts across the forecast horizon.
 * Returns a Map keyed by absolute year (e.g. 2028, 2029, ...).
 */
export function computeEventYearlyImpacts(
  event: ForecastEvent,
  scenarioStartYear: number,
  horizonYears: number,
  inflationRate: number,
): Map<number, YearlyImpact> {
  if (event.is_enabled === false) return new Map()

  const impacts = new Map<number, YearlyImpact>()
  const eventYear = new Date(event.event_date).getFullYear()
  const details = (event.details ?? {}) as Record<string, unknown>
  const endYear = scenarioStartYear + horizonYears - 1

  const addImpact = (year: number, income: number, expense: number) => {
    if (year < scenarioStartYear || year > endYear) return
    const existing = impacts.get(year) ?? { income: 0, expense: 0 }
    impacts.set(year, { income: existing.income + income, expense: existing.expense + expense })
  }

  const inflationFactor = (year: number) =>
    Math.pow(1 + inflationRate, year - scenarioStartYear)

  switch (event.event_type) {
    case "PROPERTY": {
      const d = details as Partial<PropertyDetails>
      const price = d.home_price ?? Number(event.amount)
      const paymentType = d.payment_type ?? "cash"
      const downPct = d.down_payment_pct ?? 100
      const downPayment = price * (downPct / 100)

      if (paymentType === "cash") {
        addImpact(eventYear, 0, price * inflationFactor(eventYear))
      } else {
        // Down payment in event year
        addImpact(eventYear, 0, downPayment * inflationFactor(eventYear))
        // Mortgage payments for loan term
        const principal = price - downPayment
        const rate = d.interest_rate ?? 0.065
        const term = d.loan_term_years ?? 30
        const annualPayment = computeAnnualMortgagePayment(principal, rate, term)
        for (let y = 1; y <= term; y++) {
          const paymentYear = eventYear + y
          // Mortgage is fixed nominal — no inflation adjustment on the payment itself
          addImpact(paymentYear, 0, annualPayment)
        }
      }
      break
    }

    case "VEHICLE": {
      const d = details as Partial<VehicleDetails>
      const price = d.price ?? Number(event.amount)
      const paymentType = d.payment_type ?? "cash"
      const downPct = d.down_payment_pct ?? 100
      const downPayment = price * (downPct / 100)

      if (paymentType === "cash") {
        addImpact(eventYear, 0, price * inflationFactor(eventYear))
      } else {
        addImpact(eventYear, 0, downPayment * inflationFactor(eventYear))
        const principal = price - downPayment
        const rate = d.interest_rate ?? 0.05
        const term = d.loan_term_years ?? 5
        const annualPayment = computeAnnualMortgagePayment(principal, rate, term)
        for (let y = 1; y <= term; y++) {
          addImpact(eventYear + y, 0, annualPayment)
        }
      }
      break
    }

    case "KIDS": {
      const d = details as Partial<KidsDetails>
      const annualCost = d.annual_cost ?? Number(event.amount)
      const endAge = d.end_age ?? 18
      for (let y = 0; y < endAge; y++) {
        const year = eventYear + y
        addImpact(year, 0, annualCost * inflationFactor(year))
      }
      break
    }

    case "EDUCATION": {
      const d = details as Partial<EducationDetails>
      const annualTuition = d.annual_tuition ?? Number(event.amount)
      const duration = d.duration_years ?? 4
      for (let y = 0; y < duration; y++) {
        const year = eventYear + y
        addImpact(year, 0, annualTuition * inflationFactor(year))
      }
      break
    }

    case "RETIREMENT": {
      // Retirement is a signal — handled by CashFlowView to zero out income
      // No direct expense impact
      break
    }

    case "OTHER": {
      const d = details as Partial<OtherDetails>
      const cost = d.total_cost ?? Number(event.amount)
      const isRecurring = d.is_recurring ?? false
      const recurringYears = d.recurring_years ?? 1

      if (isRecurring) {
        for (let y = 0; y < recurringYears; y++) {
          const year = eventYear + y
          addImpact(year, 0, cost * inflationFactor(year))
        }
      } else {
        addImpact(eventYear, 0, cost * inflationFactor(eventYear))
      }
      break
    }

    default: {
      // WEDDING, HAJJ, and any unrecognized: simple lump-sum
      addImpact(eventYear, 0, Number(event.amount) * inflationFactor(eventYear))
      break
    }
  }

  return impacts
}

/**
 * Build a month-keyed event impact map from all events.
 * This is the same Map<string, number> format consumed by the MC engine and Web Worker.
 * Annual impacts are placed in January of each year.
 */
export function buildEventImpactMap(
  events: ForecastEvent[],
  scenarioStartYear: number,
  horizonYears: number,
  inflationRate: number,
): Map<string, number> {
  const monthMap = new Map<string, number>()

  for (const event of events) {
    const impacts = computeEventYearlyImpacts(event, scenarioStartYear, horizonYears, inflationRate)
    for (const [year, { income, expense }] of impacts) {
      // Place the net impact in January of that year
      const key = `${year}-01`
      const net = income - expense // income is positive, expense is subtracted
      monthMap.set(key, (monthMap.get(key) ?? 0) + net)
    }
  }

  return monthMap
}

/**
 * Build a year-keyed impact map with separate income/expense breakdown for the CashFlow chart.
 */
export function buildEventAnnualImpacts(
  events: ForecastEvent[],
  scenarioStartYear: number,
  horizonYears: number,
  inflationRate: number,
): Map<number, YearlyImpact & { items: { name: string; type: string; amount: number; isIncome: boolean }[] }> {
  const yearMap = new Map<number, YearlyImpact & { items: { name: string; type: string; amount: number; isIncome: boolean }[] }>()

  for (const event of events) {
    const impacts = computeEventYearlyImpacts(event, scenarioStartYear, horizonYears, inflationRate)
    const eventStartYear = new Date(event.event_date).getFullYear()
    for (const [year, { income, expense }] of impacts) {
      const existing = yearMap.get(year) ?? { income: 0, expense: 0, items: [] }
      existing.income += income
      existing.expense += expense
      // Only show event label in its starting year — not every year of recurring impact
      if (year === eventStartYear) {
        const isIncome = income > 0 && expense === 0
        const amount = isIncome ? income : expense
        if (amount > 0) {
          existing.items.push({ name: event.name, type: event.event_type, amount, isIncome })
        }
      }
      yearMap.set(year, existing)
    }
  }

  return yearMap
}
