'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import type { ProjectionPoint, ScenarioDraft } from '@/lib/forecast/types'

type WorkerOutput = {
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

interface ForecastEngineResult {
  projection: ProjectionPoint[] | null
  mcFinalValues: number[] | null
  isComputing: boolean
}

const DEBOUNCE_MS = 500

export function useForecastEngine(
  scenarioDraft: ScenarioDraft | null,
  netWorth: number | null,
  monthlyCashflow: number,
  eventMap: Map<string, number>,
  eventsByMonth: Map<string, string[]>,
  dob?: string | null,
  eventDetailsByMonth?: Map<string, { name: string; type: string; amount: number }[]>,
  retirementDateISO?: string | null,
): ForecastEngineResult {
  const workerRef = useRef<Worker | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [result, setResult] = useState<ForecastEngineResult>({
    projection: null,
    mcFinalValues: null,
    isComputing: false,
  })

  const eventMapSerialized = useMemo(
    () => JSON.stringify(Array.from(eventMap.entries())),
    [eventMap]
  )

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('@/lib/forecast/simulation.worker.ts', import.meta.url)
      )
    } catch {
      workerRef.current = null
    }
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    if (!scenarioDraft || netWorth === null) {
      setResult({ projection: null, mcFinalValues: null, isComputing: false })
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    setResult((prev) => ({ ...prev, isComputing: true }))

    debounceRef.current = setTimeout(() => {
      const worker = workerRef.current
      if (!worker) {
        const { computeProjection } = require('@/lib/forecast/engine')
        const dobDate = dob ? new Date(dob) : null
        const { projection, mcFinalValues } = computeProjection(
          scenarioDraft, netWorth, monthlyCashflow, eventMap, eventsByMonth, dobDate, eventDetailsByMonth, retirementDateISO
        )
        setResult({ projection, mcFinalValues, isComputing: false })
        return
      }

      const inflationRate = scenarioDraft.inflation_rate
      const meanMonthly =
        Math.pow((1 + scenarioDraft.expected_annual_return) / (1 + inflationRate), 1 / 12) - 1
      const volatilityMonthly = Number(scenarioDraft.annual_volatility) / Math.sqrt(12)
      const baseCashflow =
        Number(scenarioDraft.monthly_contribution) -
        Number(scenarioDraft.monthly_withdrawal) +
        (scenarioDraft.include_cashflow ? monthlyCashflow : 0)

      worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
        const { percentiles, finalValues } = e.data
        const points: ProjectionPoint[] = percentiles.map((p) => ({
          ...p,
          hasEvent: eventsByMonth.has(p.monthKey),
          eventTypes: eventsByMonth.get(p.monthKey) ?? [],
          eventDetails: eventDetailsByMonth?.get(p.monthKey) ?? [],
        }))
        setResult({ projection: points, mcFinalValues: finalValues, isComputing: false })
      }

      const postRetirementCashflow = -Number(scenarioDraft.monthly_withdrawal)

      worker.postMessage({
        netWorth,
        months: Math.max(1, scenarioDraft.horizon_years * 12),
        meanMonthly,
        volatilityMonthly,
        baseCashflow,
        postRetirementCashflow,
        retirementDateISO: retirementDateISO ?? null,
        eventEntries: Array.from(eventMap.entries()),
        baseDateISO: scenarioDraft.start_date,
        simulations: 500,
        inflationRate,
        dobISO: dob ?? null,
      })
    }, DEBOUNCE_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioDraft, netWorth, monthlyCashflow, eventMapSerialized, dob, retirementDateISO])

  return result
}
