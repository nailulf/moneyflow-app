"use client"

import { Fragment, useMemo, useState, type ReactElement } from "react"
import { useTranslations } from "next-intl"
import { ChevronRight, HelpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/molecules/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/molecules/tooltip"
import { formatCurrency } from "@/lib/data-utils"
import type { ForecastEvent } from "@/lib/forecast/types"
import type { YearlySimulationRow, YearlySimulationParams } from "@/hooks/useYearlySimulation"

interface SimulationTableProps {
  rows: YearlySimulationRow[]
  params: YearlySimulationParams
  events: ForecastEvent[]
}

export function SimulationTable({ rows, params, events }: SimulationTableProps): ReactElement {
  const t = useTranslations("forecast.simulationTable")
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const {
    netWorth,
    annualReturn,
    inflationRate,
    yearOneIncome,
    yearOneExpense,
    retirementYear,
    nominalMonthlyRate,
  } = params

  const buckets = useMemo(() => {
    const BUCKET_SIZE = 5
    const groups: {
      index: number
      startYear: number
      endYear: number
      rows: typeof rows
      income: number
      expense: number
      netCashflow: number
      investmentReturn: number
      startNW: number
      endNW: number
      eventLabels: string[]
      hasRetired: boolean
    }[] = []
    for (let i = 0; i < rows.length; i += BUCKET_SIZE) {
      const slice = rows.slice(i, i + BUCKET_SIZE)
      if (slice.length === 0) continue
      const labels = new Set<string>()
      for (const r of slice) for (const l of r.eventLabels) labels.add(l)
      groups.push({
        index: i / BUCKET_SIZE,
        startYear: slice[0].year,
        endYear: slice[slice.length - 1].year,
        rows: slice,
        income: slice.reduce((s, r) => s + r.income, 0),
        expense: slice.reduce((s, r) => s + r.expense, 0),
        netCashflow: slice.reduce((s, r) => s + r.netCashflow, 0),
        investmentReturn: slice.reduce((s, r) => s + r.investmentReturn, 0),
        startNW: slice[0].startNW,
        endNW: slice[slice.length - 1].endNW,
        eventLabels: Array.from(labels),
        hasRetired: slice.some((r) => r.isRetired),
      })
    }
    return groups
  }, [rows])

  const toggleBucket = (index: number): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("title")}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Show formulas"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-none bg-popover text-popover-foreground border shadow-md">
                <div className="text-xs space-y-1 font-mono">
                  <p><strong>Income(y)</strong> = YearOneIncome × (1 + {inflationRate})^y {retirementYear && `(= 0 after year ${retirementYear})`}</p>
                  <p><strong>Expense(y)</strong> = YearOneExpense × (1 + {inflationRate})^y + EventExpenses</p>
                  <p><strong>NetCashflow(y)</strong> = Income(y) - Expense(y)</p>
                  <p><strong>InvestmentReturn(y)</strong> = StartNW(y) × {annualReturn}</p>
                  <p><strong>EndNW(y)</strong> = StartNW(y) + InvestmentReturn(y) + NetCashflow(y)</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("startingNetWorth")}</p>
            <p className="font-semibold">{formatCurrency(netWorth)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("annualReturn")}</p>
            <p className="font-semibold">{(annualReturn * 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("inflationRate")}</p>
            <p className="font-semibold">{(inflationRate * 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("nominalMonthlyRate")}</p>
            <p className="font-semibold">{(nominalMonthlyRate * 100).toFixed(3)}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("year1Income")}</p>
            <p className="font-semibold">{formatCurrency(yearOneIncome)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("year1Expense")}</p>
            <p className="font-semibold">{formatCurrency(yearOneExpense)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("retirementYear")}</p>
            <p className="font-semibold">{retirementYear ?? t("none")}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("events")}</p>
            <p className="font-semibold">{t("eventsCount", { count: events.length })}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 px-2 font-semibold">{t("columnYear")}</th>
                <th className="py-2 px-2 font-semibold text-right">{t("columnInflation")}</th>
                <th className="py-2 px-2 font-semibold text-right">{t("columnIncome")}</th>
                <th className="py-2 px-2 font-semibold text-right">{t("columnExpense")}</th>
                <th className="py-2 px-2 font-semibold">{t("columnEventsLabel")}</th>
                <th className="py-2 px-2 font-semibold text-right">{t("columnNetCashflow")}</th>
                <th className="py-2 px-2 font-semibold text-right">{t("columnStartNW")}</th>
                <th className="py-2 px-2 font-semibold text-right">{t("columnReturn", { rate: (annualReturn * 100).toFixed(0) })}</th>
                <th className="py-2 px-2 font-semibold text-right">{t("columnEndNW")}</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => {
                const isOpen = expanded.has(bucket.index)
                return (
                  <Fragment key={bucket.index}>
                    <tr
                      className={`border-b cursor-pointer hover:bg-muted/40 ${bucket.hasRetired ? "bg-destructive/5" : "bg-muted/20"}`}
                      onClick={() => toggleBucket(bucket.index)}
                    >
                      <td className="py-2 px-2 font-semibold">
                        <span className="inline-flex items-center gap-1">
                          <ChevronRight
                            className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`}
                          />
                          {bucket.startYear}
                          {bucket.endYear !== bucket.startYear && `–${bucket.endYear}`}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">—</td>
                      <td className="py-2 px-2 text-right text-success">{formatCurrency(bucket.income)}</td>
                      <td className="py-2 px-2 text-right text-destructive">{formatCurrency(bucket.expense)}</td>
                      <td className="py-2 px-2 max-w-[150px] truncate text-muted-foreground">
                        {bucket.eventLabels.length > 0 ? bucket.eventLabels.join(", ") : "—"}
                      </td>
                      <td className={`py-2 px-2 text-right font-medium ${bucket.netCashflow >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(bucket.netCashflow)}
                      </td>
                      <td className="py-2 px-2 text-right">{formatCurrency(bucket.startNW)}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{formatCurrency(bucket.investmentReturn)}</td>
                      <td className={`py-2 px-2 text-right font-semibold ${bucket.endNW >= 0 ? "" : "text-destructive"}`}>
                        {formatCurrency(bucket.endNW)}
                      </td>
                    </tr>
                    {isOpen && bucket.rows.map((row) => (
                      <tr
                        key={row.year}
                        className={`border-b ${row.isRetired ? "bg-destructive/5" : ""} ${row.eventLabels.length > 0 ? "bg-primary/5" : ""}`}
                      >
                        <td className="py-1.5 pl-6 pr-2 font-medium">
                          {row.year}
                          {row.isRetired && row.year === retirementYear && (
                            <span className="ml-1 text-destructive font-normal">{t("retire")}</span>
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
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
