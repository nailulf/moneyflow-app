// Web Worker for Monte Carlo simulation
// Self-contained — cannot import from main bundle

type MonteCarloInput = {
  netWorth: number
  months: number
  meanMonthly: number
  volatilityMonthly: number
  monthlyIncome: number
  monthlyExpense: number
  retirementDateISO: string | null
  eventEntries: [string, number][]
  baseDateISO: string
  simulations: number
  inflationRate: number
  annualIncomeGrowth: number
  dobISO: string | null
}

type MonteCarloOutput = {
  percentiles: {
    date: string
    ageLabel: string
    monthKey: string
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
    deterministic: number
  }[]
  finalValues: number[]
}

function randomNormal(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)))
  return sorted[index]
}

function addMonthsSimple(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function formatDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

function getMonthKey(date: Date): string {
  const m = date.getMonth() + 1
  return `${date.getFullYear()}-${m < 10 ? "0" : ""}${m}`
}

function getAgeLabel(baseDate: Date, monthOffset: number, dob: Date | null): string {
  if (monthOffset === 0) return "TODAY"
  const target = addMonthsSimple(baseDate, monthOffset)
  if (dob) {
    const age = target.getFullYear() - dob.getFullYear() -
      (target.getMonth() < dob.getMonth() || (target.getMonth() === dob.getMonth() && target.getDate() < dob.getDate()) ? 1 : 0)
    return `AGE ${age}`
  }
  return `YEAR ${Math.ceil(monthOffset / 12)}`
}

self.onmessage = (e: MessageEvent<MonteCarloInput>) => {
  const {
    netWorth,
    months,
    meanMonthly,
    volatilityMonthly,
    monthlyIncome,
    monthlyExpense,
    retirementDateISO,
    eventEntries,
    baseDateISO,
    simulations,
    inflationRate,
    annualIncomeGrowth,
    dobISO,
  } = e.data

  const baseDate = new Date(baseDateISO)
  const dob = dobISO ? new Date(dobISO) : null
  const eventMap = new Map<string, number>(eventEntries)

  // Compute retirement month offset
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
    const monthDate = addMonthsSimple(baseDate, i)
    const eventAdj = eventMap.get(getMonthKey(monthDate)) ?? 0
    const inflationFactor = Math.pow(1 + inflationRate, i / 12)
    const incomeFactor = Math.pow(1 + annualIncomeGrowth, i / 12)
    const income = (retirementMonth !== null && i >= retirementMonth) ? 0 : monthlyIncome * incomeFactor
    const expense = monthlyExpense * inflationFactor
    deterministicValue = deterministicValue * (1 + meanMonthly) + income - expense + eventAdj
    deterministicSeries.push(deterministicValue)
  }

  // Monte Carlo
  const series: number[][] = Array.from({ length: months + 1 }, () => [])
  const finalValues: number[] = []

  for (let sim = 0; sim < simulations; sim += 1) {
    let value = netWorth
    series[0].push(value)
    for (let i = 1; i <= months; i += 1) {
      const monthDate = addMonthsSimple(baseDate, i)
      const eventAdj = eventMap.get(getMonthKey(monthDate)) ?? 0
      const inflationFactor = Math.pow(1 + inflationRate, i / 12)
      const incomeFactor = Math.pow(1 + annualIncomeGrowth, i / 12)
      const income = (retirementMonth !== null && i >= retirementMonth) ? 0 : monthlyIncome * incomeFactor
      const expense = monthlyExpense * inflationFactor
      const monthlyFlow = income - expense + eventAdj
      const shock = randomNormal()
      const monthlyReturn = meanMonthly + volatilityMonthly * shock
      value = value * (1 + monthlyReturn) + monthlyFlow
      series[i].push(value)
    }
    finalValues.push(value)
  }

  // Build output
  const percentiles: MonteCarloOutput["percentiles"] = []
  for (let i = 0; i <= months; i += 1) {
    const monthDate = addMonthsSimple(baseDate, i)
    const values = series[i]
    percentiles.push({
      date: formatDate(monthDate),
      ageLabel: getAgeLabel(baseDate, i, dob),
      monthKey: getMonthKey(monthDate),
      p10: percentile(values, 0.1),
      p25: percentile(values, 0.25),
      p50: percentile(values, 0.5),
      p75: percentile(values, 0.75),
      p90: percentile(values, 0.9),
      deterministic: deterministicSeries[i],
    })
  }

  const output: MonteCarloOutput = { percentiles, finalValues }
  self.postMessage(output)
}
