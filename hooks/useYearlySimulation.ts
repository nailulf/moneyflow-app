'use client'

import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useForecastScenarios,
  useForecastEvents,
  useForecastNetWorth,
  useForecastCashflow,
  useForecastUserDOB,
} from '@/hooks/useForecastQuery'
import { buildDraft } from '@/lib/forecast/types'
import type { ForecastEvent, ProjectionPoint } from '@/lib/forecast/types'
import { computeEventYearlyImpacts } from '@/lib/forecast/event-impact'
import { getAgeLabel } from '@/lib/forecast/engine'

// --- Exported types ---

export type YearlySimulationRow = {
  year: number
  yearIndex: number
  ageLabel: string
  inflationFactor: number
  income: number
  expense: number
  eventIncome: number
  eventExpense: number
  eventLabels: string[]
  eventTypes: string[]
  netCashflow: number
  startNW: number
  investmentReturn: number
  endNW: number
  isRetired: boolean
}

export type YearlySimulationParams = {
  netWorth: number
  annualReturn: number
  inflationRate: number
  horizonYears: number
  startYear: number
  yearOneIncome: number
  yearOneExpense: number
  retirementYear: number | null
  eventCount: number
  nominalMonthlyRate: number
}

// --- Converter: yearly rows → ProjectionPoint[] for chart ---

export function yearlyRowsToProjection(rows: YearlySimulationRow[]): ProjectionPoint[] {
  return rows.map((row) => ({
    date: `Jan ${row.year}`,
    ageLabel: row.ageLabel,
    monthKey: `${row.year}-01`,
    p10: row.endNW,
    p25: row.endNW,
    p50: row.endNW,
    p75: row.endNW,
    p90: row.endNW,
    deterministic: row.endNW,
    hasEvent: row.eventLabels.length > 0,
    eventTypes: row.eventTypes,
    eventDetails: row.eventLabels.map((label, i) => ({
      name: label,
      type: row.eventTypes[i] ?? '',
      amount: row.eventExpense,
    })),
    eventSpending: row.eventExpense > 0 ? row.eventExpense : undefined,
  }))
}

// --- Pure row builder (extracted for unit testing) ---

export type BuildYearlyRowsInput = {
  netWorth: number
  yearOneIncome: number
  yearOneExpense: number
  inflationRate: number
  incomeGrowth: number
  annualReturn: number
  horizonYears: number
  startYear: number
  retirementYear: number | null
  eventImpacts: Map<number, { income: number; expense: number; labels: string[]; types: string[] }>
  baseDate: Date
  dob: Date | null
}

export function buildYearlyRows(input: BuildYearlyRowsInput): YearlySimulationRow[] {
  const {
    netWorth,
    yearOneIncome,
    yearOneExpense,
    inflationRate,
    incomeGrowth,
    annualReturn,
    horizonYears,
    startYear,
    retirementYear,
    eventImpacts,
    baseDate,
    dob,
  } = input

  const result: YearlySimulationRow[] = []
  let nw = netWorth
  for (let y = 0; y < Math.min(horizonYears, 50); y++) {
    const currentYear = startYear + y
    const inflationFactor = Math.pow(1 + inflationRate, y)
    const incomeFactor = Math.pow(1 + incomeGrowth, y)
    const isRetired = retirementYear !== null && currentYear >= retirementYear

    const baseIncome = isRetired ? 0 : yearOneIncome * incomeFactor
    const baseExpense = yearOneExpense * inflationFactor

    const ei = eventImpacts.get(currentYear)
    const eventIncome = ei?.income ?? 0
    const eventExpense = ei?.expense ?? 0
    const eventLabels = ei?.labels ?? []
    const eventTypes = ei?.types ?? []

    const totalIncome = baseIncome + eventIncome
    const totalExpense = baseExpense + eventExpense
    const netCashflow = totalIncome - totalExpense

    const startNW = nw
    const investmentReturn = startNW * annualReturn
    const endNW = startNW + investmentReturn + netCashflow

    result.push({
      year: currentYear,
      yearIndex: y,
      ageLabel: getAgeLabel(baseDate, y * 12, dob),
      inflationFactor,
      income: totalIncome,
      expense: totalExpense,
      eventIncome,
      eventExpense,
      eventLabels,
      eventTypes,
      netCashflow,
      startNW,
      investmentReturn,
      endNW,
      isRetired,
    })

    nw = endNW
  }
  return result
}

// --- Shared hook ---

export function useYearlySimulation(): {
  rows: YearlySimulationRow[]
  params: YearlySimulationParams
  events: ForecastEvent[]
  isLoading: boolean
} {
  const { user } = useAuth()
  const { data: scenarios = [], isLoading: scenariosLoading } = useForecastScenarios()
  const defaultScenario = scenarios.find((s) => s.is_default) ?? scenarios[0]
  const { data: events = [], isLoading: eventsLoading } = useForecastEvents(defaultScenario?.id ?? null)
  const { data: netWorthData, isLoading: nwLoading } = useForecastNetWorth(user?.id)
  const { data: cashflowData, isLoading: cfLoading } = useForecastCashflow()
  const { data: userDOB } = useForecastUserDOB()

  const netWorth = netWorthData?.currentNetWorth ?? 0
  const annualIncome = cashflowData?.annualIncome ?? 0
  const annualExpenses = cashflowData?.annualExpenses ?? 0

  const draft = defaultScenario ? buildDraft(defaultScenario) : null
  const inflationRate = draft?.inflation_rate ?? 0.03
  const incomeGrowth = draft?.annual_income_growth ?? 0
  const annualReturn = draft?.expected_annual_return ?? 0.07
  const horizonYears = draft?.horizon_years ?? 50
  const monthlyContribution = draft?.monthly_contribution ?? 0
  const monthlyWithdrawal = draft?.monthly_withdrawal ?? 0

  const nominalMonthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1
  const startYear = draft ? new Date(draft.start_date).getFullYear() : new Date().getFullYear()
  const baseDate = draft ? new Date(draft.start_date) : new Date()
  const dob = userDOB ? new Date(userDOB) : null

  const yearOneIncome = annualIncome + monthlyContribution * 12
  const yearOneExpense = annualExpenses + monthlyWithdrawal * 12

  const retirementEvent = events.find((e) => e.event_type === 'RETIREMENT' && e.is_enabled !== false)
  const retirementYear = retirementEvent ? new Date(retirementEvent.event_date).getFullYear() : null

  const eventImpacts = useMemo(() => {
    const allImpacts = new Map<number, { income: number; expense: number; labels: string[]; types: string[] }>()
    for (const event of events) {
      if (event.is_enabled === false) continue
      const impacts = computeEventYearlyImpacts(event, startYear, horizonYears, inflationRate)
      for (const [year, { income, expense }] of impacts) {
        const existing = allImpacts.get(year) ?? { income: 0, expense: 0, labels: [], types: [] }
        existing.income += income
        existing.expense += expense
        if (!existing.labels.includes(event.name)) existing.labels.push(event.name)
        if (!existing.types.includes(event.event_type)) existing.types.push(event.event_type)
        allImpacts.set(year, existing)
      }
    }
    return allImpacts
  }, [events, startYear, horizonYears, inflationRate])

  const rows = useMemo(
    () =>
      buildYearlyRows({
        netWorth,
        yearOneIncome,
        yearOneExpense,
        inflationRate,
        incomeGrowth,
        annualReturn,
        horizonYears,
        startYear,
        retirementYear,
        eventImpacts,
        baseDate,
        dob,
      }),
    [netWorth, yearOneIncome, yearOneExpense, inflationRate, incomeGrowth, annualReturn, horizonYears, startYear, retirementYear, eventImpacts, baseDate, dob]
  )

  const params: YearlySimulationParams = {
    netWorth,
    annualReturn,
    inflationRate,
    horizonYears,
    startYear,
    yearOneIncome,
    yearOneExpense,
    retirementYear,
    eventCount: events.length,
    nominalMonthlyRate,
  }

  return {
    rows,
    params,
    events,
    isLoading: scenariosLoading || eventsLoading || nwLoading || cfLoading,
  }
}
