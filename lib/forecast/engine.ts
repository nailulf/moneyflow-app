import { format, addMonths, differenceInYears } from "date-fns"
import type { MonteCarloResult, NetWorthDataPoint, ProjectionPoint, ScenarioDraft } from "./types"

export const getMonthKey = (date: Date): string => format(date, "yyyy-MM")

/**
 * Generate age-based X-axis label.
 * Returns "TODAY" for monthOffset=0, "AGE 34" if DOB is known, "YEAR 3" as fallback.
 */
export function getAgeLabel(baseDate: Date, monthOffset: number, dob: Date | null): string {
  if (monthOffset === 0) return "TODAY"
  const targetDate = addMonths(baseDate, monthOffset)
  if (dob) {
    const age = differenceInYears(targetDate, dob)
    return `AGE ${age}`
  }
  const year = Math.ceil(monthOffset / 12)
  return `YEAR ${year}`
}

export const calculateRealMonthlyRate = (annualReturn: number, annualInflation: number): number =>
  Math.pow((1 + annualReturn) / (1 + annualInflation), 1 / 12) - 1

export const calculateNominalMonthlyRate = (annualReturn: number): number =>
  Math.pow(1 + annualReturn, 1 / 12) - 1

export const randomNormal = (): number => {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export const percentile = (values: number[], p: number): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)))
  return sorted[index]
}

export const medianOf = (values: number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export const runMonteCarlo = (
  netWorth: number,
  months: number,
  meanMonthly: number,
  volatilityMonthly: number,
  monthlyIncome: number,
  monthlyExpense: number,
  retirementMonth: number | null,
  eventMap: Map<string, number>,
  baseDate: Date,
  simulations: number,
  inflationRate: number,
): MonteCarloResult => {
  const series: number[][] = Array.from({ length: months + 1 }, () => [])
  const finalValues: number[] = []
  for (let sim = 0; sim < simulations; sim += 1) {
    let value = netWorth
    series[0].push(value)
    for (let i = 1; i <= months; i += 1) {
      const monthDate = addMonths(baseDate, i)
      const eventAdjustment = eventMap.get(getMonthKey(monthDate)) ?? 0
      const inflationFactor = Math.pow(1 + inflationRate, i / 12)
      const income = (retirementMonth !== null && i >= retirementMonth)
        ? 0
        : monthlyIncome * inflationFactor
      const expense = monthlyExpense * inflationFactor
      const monthlyFlow = income - expense + eventAdjustment
      const shock = randomNormal()
      const monthlyReturn = meanMonthly + volatilityMonthly * shock
      value = value * (1 + monthlyReturn) + monthlyFlow
      series[i].push(value)
    }
    finalValues.push(value)
  }
  return { series, finalValues }
}

export function computeProjection(
  scenarioDraft: ScenarioDraft,
  netWorth: number,
  monthlyIncomeBase: number,
  monthlyExpenseBase: number,
  eventMap: Map<string, number>,
  eventsByMonth: Map<string, string[]>,
  dob?: Date | null,
  eventDetailsByMonth?: Map<string, { name: string; type: string; amount: number }[]>,
  retirementDateISO?: string | null,
): { projection: ProjectionPoint[]; mcFinalValues: number[] } {
  const months = Math.max(1, scenarioDraft.horizon_years * 12)
  const baseDate = new Date(scenarioDraft.start_date)
  const inflationRate = scenarioDraft.inflation_rate
  const meanMonthly = calculateNominalMonthlyRate(
    scenarioDraft.expected_annual_return
  )
  const volatilityMonthly = Number(scenarioDraft.annual_volatility) / Math.sqrt(12)

  // Monthly income = cashflow income (if enabled) + contributions
  // Monthly expense = cashflow expenses (if enabled) + withdrawals
  const monthlyIncome = (scenarioDraft.include_cashflow ? monthlyIncomeBase : 0) +
    Number(scenarioDraft.monthly_contribution)
  const monthlyExpense = (scenarioDraft.include_cashflow ? monthlyExpenseBase : 0) +
    Number(scenarioDraft.monthly_withdrawal)

  // Compute retirement month offset from scenario start
  let retirementMonth: number | null = null
  if (retirementDateISO) {
    const retDate = new Date(retirementDateISO)
    const diffMs = retDate.getTime() - baseDate.getTime()
    retirementMonth = Math.max(1, Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000)))
  }

  // Deterministic path
  const deterministicSeries: number[] = []
  let deterministicValue = netWorth
  deterministicSeries.push(deterministicValue)
  for (let i = 1; i <= months; i += 1) {
    const monthDate = addMonths(baseDate, i)
    const eventAdjustment = eventMap.get(getMonthKey(monthDate)) ?? 0
    const inflationFactor = Math.pow(1 + inflationRate, i / 12)
    const income = (retirementMonth !== null && i >= retirementMonth)
      ? 0
      : monthlyIncome * inflationFactor
    const expense = monthlyExpense * inflationFactor
    const monthlyFlow = income - expense + eventAdjustment
    deterministicValue = deterministicValue * (1 + meanMonthly) + monthlyFlow
    deterministicSeries.push(deterministicValue)
  }

  // Monte Carlo — 500 simulations
  const simulations = 500
  const { series, finalValues } = runMonteCarlo(
    netWorth,
    months,
    meanMonthly,
    volatilityMonthly,
    monthlyIncome,
    monthlyExpense,
    retirementMonth,
    eventMap,
    baseDate,
    simulations,
    inflationRate,
  )

  const points: ProjectionPoint[] = []
  for (let i = 0; i <= months; i += 1) {
    const dateLabel = format(addMonths(baseDate, i), "MMM yyyy")
    const monthKey = getMonthKey(addMonths(baseDate, i))
    const values = series[i]
    points.push({
      date: dateLabel,
      ageLabel: getAgeLabel(baseDate, i, dob ?? null),
      monthKey,
      p10: percentile(values, 0.1),
      p25: percentile(values, 0.25),
      p50: percentile(values, 0.5),
      p75: percentile(values, 0.75),
      p90: percentile(values, 0.9),
      deterministic: deterministicSeries[i],
      hasEvent: eventsByMonth.has(monthKey),
      eventTypes: eventsByMonth.get(monthKey) ?? [],
      eventDetails: eventDetailsByMonth?.get(monthKey) ?? [],
    })
  }
  return { projection: points, mcFinalValues: finalValues }
}

export function computeSuccessRate(mcFinalValues: number[], target: number): number {
  const successCount = mcFinalValues.filter((v) => v >= target).length
  return Math.round((successCount / mcFinalValues.length) * 100)
}

/**
 * Compute CAGR from historical net worth data points.
 * Returns null if insufficient data (< 6 months).
 */
export function computeCAGR(dataPoints: NetWorthDataPoint[]): number | null {
  if (dataPoints.length < 2) return null
  const earliest = dataPoints[0]
  const latest = dataPoints[dataPoints.length - 1]
  if (earliest.value <= 0 || latest.value <= 0) return null

  const earliestDate = new Date(earliest.date)
  const latestDate = new Date(latest.date)
  const years = (latestDate.getTime() - earliestDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  // Require at least 6 months of data
  if (years < 0.5) return null

  const cagr = Math.pow(latest.value / earliest.value, 1 / years) - 1
  // Clamp to reasonable range
  return Math.max(-0.5, Math.min(0.5, cagr))
}
