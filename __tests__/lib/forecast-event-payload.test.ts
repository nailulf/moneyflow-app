import { buildEventPayload, type EventFormFields } from "@/lib/forecast/event-payload"

const base: EventFormFields = {
  year: 2030, homePrice: 800_000_000, paymentType: "loan", downPaymentPct: 20, loanTermYears: 30,
  interestRatePct: 6.5, totalCost: 250_000_000, annualCost: 60_000_000, endAge: 18,
  annualTuition: 50_000_000, durationYears: 4, isRecurring: false, recurringYears: 1,
}

describe("buildEventPayload", () => {
  it("PROPERTY loan: amount = price * downPct, interest stored as fraction, key home_price", () => {
    const r = buildEventPayload("PROPERTY", base)
    expect(r.amount).toBe(800_000_000 * 0.2)
    expect(r.details).toMatchObject({ home_price: 800_000_000, payment_type: "loan", down_payment_pct: 20, loan_term_years: 30, interest_rate: 0.065 })
    expect(r.event_date).toBe("2030-01-01")
  })
  it("PROPERTY cash: amount = full price", () => {
    expect(buildEventPayload("PROPERTY", { ...base, paymentType: "cash" }).amount).toBe(800_000_000)
  })
  it("VEHICLE uses key price (not home_price)", () => {
    expect(buildEventPayload("VEHICLE", base).details).toMatchObject({ price: 800_000_000 })
  })
  it("KIDS: amount = annualCost * endAge", () => {
    const r = buildEventPayload("KIDS", base)
    expect(r.amount).toBe(60_000_000 * 18)
    expect(r.details).toEqual({ annual_cost: 60_000_000, end_age: 18 })
  })
  it("EDUCATION: amount = tuition * duration", () => {
    expect(buildEventPayload("EDUCATION", base).amount).toBe(50_000_000 * 4)
  })
  it("RETIREMENT: amount 0, empty details", () => {
    expect(buildEventPayload("RETIREMENT", base)).toMatchObject({ amount: 0, details: {} })
  })
  it("OTHER recurring keeps recurring_years; non-recurring forces 1", () => {
    expect(buildEventPayload("OTHER", { ...base, isRecurring: true, recurringYears: 5 }).details).toMatchObject({ total_cost: 250_000_000, is_recurring: true, recurring_years: 5 })
    expect(buildEventPayload("OTHER", { ...base, isRecurring: false, recurringYears: 5 }).details).toMatchObject({ is_recurring: false, recurring_years: 1 })
  })
  it("WEDDING/HAJJ: { total_cost }", () => {
    expect(buildEventPayload("WEDDING", base).details).toEqual({ total_cost: 250_000_000 })
    expect(buildEventPayload("HAJJ", base).details).toEqual({ total_cost: 250_000_000 })
  })
})
