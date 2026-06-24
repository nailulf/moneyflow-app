import { buildProjectionInputs } from "@/lib/forecast/projection-inputs"
import { defaultScenarioPayload } from "@/lib/forecast/types"

const draft = { ...defaultScenarioPayload, start_date: "2026-01-01", horizon_years: 10, inflation_rate: 0.03 } as any
const ev = (over: any) => ({ id: "e", scenario_id: "s", name: "Home", event_type: "HOME", event_date: "2030-06-15", amount: 100, is_enabled: true, note: null, details: {}, ...over })

describe("buildProjectionInputs", () => {
  it("indexes enabled events by exact month and January, and finds retirement", () => {
    const r = buildProjectionInputs([ev({}), ev({ event_type: "RETIREMENT", event_date: "2035-03-01" })], draft)
    expect(r.eventsByMonth.get("2030-06")).toContain("HOME")
    expect(r.eventsByMonth.get("2030-01")).toContain("HOME")        // January index
    expect(r.retirementDateISO).toBe("2035-03-01")
    expect(r.eventMap.size).toBeGreaterThan(0)
  })
  it("skips disabled events and returns null retirement when none", () => {
    const r = buildProjectionInputs([ev({ is_enabled: false })], draft)
    expect(r.eventsByMonth.size).toBe(0)
    expect(r.retirementDateISO).toBeNull()
  })
})
