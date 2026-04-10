"use client"

import { useMemo, type ReactElement } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { PageLayout, TopContent } from "@/components/PageLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/molecules/card"
import { formatCurrency } from "@/lib/data-utils"
import {
  useForecastScenarios,
  useForecastEvents,
  useForecastNetWorth,
  useForecastCashflow,
} from "@/hooks/useForecastQuery"
import { buildDraft } from "@/lib/forecast/types"
import { computeAnnualMortgagePayment, computeEventYearlyImpacts } from "@/lib/forecast/event-impact"

export default function SimulationTablePage(): ReactElement {
  const { user } = useAuth()
  const { data: scenarios = [] } = useForecastScenarios()
  const defaultScenario = scenarios.find((s) => s.is_default) ?? scenarios[0]
  const { data: events = [] } = useForecastEvents(defaultScenario?.id ?? null)
  const { data: netWorthData } = useForecastNetWorth(user?.id)
  const { data: cashflowData } = useForecastCashflow()

  const netWorth = netWorthData?.currentNetWorth ?? 0
  const annualIncome = cashflowData?.annualIncome ?? 0
  const annualExpenses = cashflowData?.annualExpenses ?? 0
  const monthlyCashflow = cashflowData?.median ?? 0

  const draft = defaultScenario ? buildDraft(defaultScenario) : null
  const inflationRate = draft?.inflation_rate ?? 0.03
  const annualReturn = draft?.expected_annual_return ?? 0.07
  const horizonYears = draft?.horizon_years ?? 50
  const monthlyContribution = draft?.monthly_contribution ?? 0
  const monthlyWithdrawal = draft?.monthly_withdrawal ?? 0

  // Derived
  const realMonthlyRate = Math.pow((1 + annualReturn) / (1 + inflationRate), 1 / 12) - 1
  const startYear = draft ? new Date(draft.start_date).getFullYear() : new Date().getFullYear()

  // Baseline cashflow
  const yearOneIncome = annualIncome + monthlyContribution * 12
  const yearOneExpense = annualExpenses + monthlyWithdrawal * 12
  const monthlyBaseCashflow = (yearOneIncome - yearOneExpense) / 12
  const monthlyPostRetirement = -(yearOneExpense / 12)

  // Find retirement
  const retirementEvent = events.find((e) => e.event_type === "RETIREMENT" && e.is_enabled !== false)
  const retirementYear = retirementEvent ? new Date(retirementEvent.event_date).getFullYear() : null

  // Build event impacts
  const eventImpacts = useMemo(() => {
    const allImpacts = new Map<number, { income: number; expense: number; labels: string[] }>()
    for (const event of events) {
      if (event.is_enabled === false) continue
      const impacts = computeEventYearlyImpacts(event, startYear, horizonYears, inflationRate)
      for (const [year, { income, expense }] of impacts) {
        const existing = allImpacts.get(year) ?? { income: 0, expense: 0, labels: [] }
        existing.income += income
        existing.expense += expense
        if (!existing.labels.includes(event.name)) existing.labels.push(event.name)
        allImpacts.set(year, existing)
      }
    }
    return allImpacts
  }, [events, startYear, horizonYears, inflationRate])

  // Build the table
  const rows = useMemo(() => {
    const result: {
      year: number
      yearIndex: number
      inflationFactor: number
      income: number
      expense: number
      eventIncome: number
      eventExpense: number
      eventLabels: string[]
      netCashflow: number
      startNW: number
      investmentReturn: number
      endNW: number
      isRetired: boolean
    }[] = []

    let nw = netWorth
    for (let y = 0; y < Math.min(horizonYears, 50); y++) {
      const currentYear = startYear + y
      const inflationFactor = Math.pow(1 + inflationRate, y)
      const isRetired = retirementYear !== null && currentYear >= retirementYear

      // Income: grows with inflation, stops at retirement
      const baseIncome = isRetired ? 0 : yearOneIncome * inflationFactor
      // Expense: grows with inflation always
      const baseExpense = yearOneExpense * inflationFactor

      // Event impacts for this year
      const ei = eventImpacts.get(currentYear)
      const eventIncome = ei?.income ?? 0
      const eventExpense = ei?.expense ?? 0
      const eventLabels = ei?.labels ?? []

      const totalIncome = baseIncome + eventIncome
      const totalExpense = baseExpense + eventExpense
      const netCashflow = totalIncome - totalExpense

      // Net worth: start of year + investment return + net cashflow
      const startNW = nw
      const investmentReturn = startNW * annualReturn
      const endNW = startNW + investmentReturn + netCashflow

      result.push({
        year: currentYear,
        yearIndex: y,
        inflationFactor,
        income: totalIncome,
        expense: totalExpense,
        eventIncome,
        eventExpense,
        eventLabels,
        netCashflow,
        startNW,
        investmentReturn,
        endNW,
        isRetired,
      })

      nw = endNW
    }
    return result
  }, [netWorth, yearOneIncome, yearOneExpense, inflationRate, annualReturn, horizonYears, startYear, retirementYear, eventImpacts])

  return (
    <div className="flex flex-col h-full">
      <PageLayout>
        <TopContent>
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle>Forecast Simulation Table</CardTitle>
              <CardDescription>Year-by-year breakdown of income, expenses, events, and net worth growth.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Parameters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Starting Net Worth</p>
                  <p className="font-semibold">{formatCurrency(netWorth)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Annual Return</p>
                  <p className="font-semibold">{(annualReturn * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Inflation Rate</p>
                  <p className="font-semibold">{(inflationRate * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Real Monthly Rate</p>
                  <p className="font-semibold">{(realMonthlyRate * 100).toFixed(3)}%</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Year 1 Income</p>
                  <p className="font-semibold">{formatCurrency(yearOneIncome)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Year 1 Expense</p>
                  <p className="font-semibold">{formatCurrency(yearOneExpense)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Retirement Year</p>
                  <p className="font-semibold">{retirementYear ?? "None"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Events</p>
                  <p className="font-semibold">{events.length} events</p>
                </div>
              </div>

              {/* Formulas */}
              <div className="rounded-lg border bg-muted/30 p-4 mb-6 text-xs space-y-1 font-mono">
                <p><strong>Income(y)</strong> = YearOneIncome × (1 + {inflationRate})^y {retirementYear && `(= 0 after year ${retirementYear})`}</p>
                <p><strong>Expense(y)</strong> = YearOneExpense × (1 + {inflationRate})^y + EventExpenses</p>
                <p><strong>NetCashflow(y)</strong> = Income(y) - Expense(y)</p>
                <p><strong>InvestmentReturn(y)</strong> = StartNW(y) × {annualReturn}</p>
                <p><strong>EndNW(y)</strong> = StartNW(y) + InvestmentReturn(y) + NetCashflow(y)</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 px-2 font-semibold">Year</th>
                      <th className="py-2 px-2 font-semibold text-right">Inflation ×</th>
                      <th className="py-2 px-2 font-semibold text-right">Income</th>
                      <th className="py-2 px-2 font-semibold text-right">Expense</th>
                      <th className="py-2 px-2 font-semibold">Events</th>
                      <th className="py-2 px-2 font-semibold text-right">Net Cashflow</th>
                      <th className="py-2 px-2 font-semibold text-right">Start NW</th>
                      <th className="py-2 px-2 font-semibold text-right">Return ({(annualReturn * 100).toFixed(0)}%)</th>
                      <th className="py-2 px-2 font-semibold text-right">End NW</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.year}
                        className={`border-b ${row.isRetired ? "bg-destructive/5" : ""} ${row.eventLabels.length > 0 ? "bg-primary/5" : ""}`}
                      >
                        <td className="py-1.5 px-2 font-medium">
                          {row.year}
                          {row.isRetired && row.year === retirementYear && (
                            <span className="ml-1 text-destructive font-normal">(retire)</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">{row.inflationFactor.toFixed(3)}</td>
                        <td className={`py-1.5 px-2 text-right ${row.isRetired ? "text-muted-foreground" : "text-success"}`}>
                          {formatCurrency(row.income)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-destructive">
                          {formatCurrency(row.expense)}
                        </td>
                        <td className="py-1.5 px-2 max-w-[150px] truncate text-muted-foreground">
                          {row.eventLabels.length > 0 ? row.eventLabels.join(", ") : "—"}
                          {row.eventExpense > 0 && (
                            <span className="text-destructive ml-1">(-{formatCurrency(row.eventExpense)})</span>
                          )}
                        </td>
                        <td className={`py-1.5 px-2 text-right font-medium ${row.netCashflow >= 0 ? "text-success" : "text-destructive"}`}>
                          {formatCurrency(row.netCashflow)}
                        </td>
                        <td className="py-1.5 px-2 text-right">{formatCurrency(row.startNW)}</td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">{formatCurrency(row.investmentReturn)}</td>
                        <td className={`py-1.5 px-2 text-right font-semibold ${row.endNW >= 0 ? "" : "text-destructive"}`}>
                          {formatCurrency(row.endNW)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TopContent>
      </PageLayout>
    </div>
  )
}
