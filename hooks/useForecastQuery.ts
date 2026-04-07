'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './useDataRefresh'
import type {
  ForecastScenario,
  ForecastEvent,
  NetWorthResponse,
  MonthlyCashflowResponse,
  ScenarioDraft,
} from '@/lib/forecast/types'
import { defaultScenarioPayload } from '@/lib/forecast/types'
import { medianOf } from '@/lib/forecast/engine'

// --- Fetch functions ---

async function fetchScenarios(): Promise<ForecastScenario[]> {
  const response = await fetch('/api/wealth-forecast/scenarios', { cache: 'no-store' })
  if (!response.ok) throw new Error('Failed to fetch scenarios')
  const data = (await response.json()) as ForecastScenario[]
  if (data.length === 0) {
    const created = await fetch('/api/wealth-forecast/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultScenarioPayload),
    })
    if (!created.ok) throw new Error('Failed to create default scenario')
    const scenario = (await created.json()) as ForecastScenario
    return [scenario]
  }
  return data
}

async function fetchEvents(scenarioId: string): Promise<ForecastEvent[]> {
  const response = await fetch(`/api/wealth-forecast/events?scenarioId=${scenarioId}`, { cache: 'no-store' })
  if (!response.ok) return []
  return (await response.json()) as ForecastEvent[]
}

type NetWorthResult = {
  currentNetWorth: number
  historicalData: NetWorthResponse['netWorthData']
}

async function fetchNetWorth(userId: string): Promise<NetWorthResult> {
  const response = await fetch(`/api/net-worth?userId=${userId}&period=ALL`, { cache: 'no-store' })
  if (!response.ok) return { currentNetWorth: 0, historicalData: [] }
  const data = (await response.json()) as NetWorthResponse
  return { currentNetWorth: data.currentNetWorth ?? 0, historicalData: data.netWorthData }
}

async function fetchMonthlyCashflow(): Promise<{ median: number; monthsUsed: number }> {
  const response = await fetch('/api/transactions/monthly?months=12', { cache: 'no-store' })
  if (!response.ok) return { median: 0, monthsUsed: 0 }
  const data = (await response.json()) as MonthlyCashflowResponse
  const allMonths = data.monthlyData ?? []
  const withData = allMonths.filter((m) => m.transactionCount > 0)
  const source = withData.length >= 2 ? withData : allMonths
  if (source.length === 0) return { median: 0, monthsUsed: 0 }
  return { median: medianOf(source.map((m) => m.netCashFlow)), monthsUsed: source.length }
}

// --- Query hooks ---

export function useForecastScenarios() {
  return useQuery({
    queryKey: queryKeys.forecastScenarios(),
    queryFn: fetchScenarios,
    staleTime: 30 * 1000,
  })
}

export function useForecastEvents(scenarioId: string | null) {
  return useQuery({
    queryKey: queryKeys.forecastEvents(scenarioId ?? ''),
    queryFn: () => fetchEvents(scenarioId!),
    enabled: !!scenarioId,
    staleTime: 30 * 1000,
  })
}

export function useForecastNetWorth(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.netWorth(userId),
    queryFn: () => fetchNetWorth(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
    select: (data) => data,
  })
}

export function useForecastCashflow() {
  return useQuery({
    queryKey: queryKeys.forecastCashflow(),
    queryFn: fetchMonthlyCashflow,
    staleTime: 60 * 1000,
  })
}

// --- Mutation hooks ---

export function useSaveScenario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ scenarioId, draft }: { scenarioId: string; draft: ScenarioDraft }) => {
      const response = await fetch(`/api/wealth-forecast/scenarios/${scenarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!response.ok) throw new Error('Failed to save scenario')
      return (await response.json()) as ForecastScenario
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.forecastScenarios() })
      toast.success('Scenario saved')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useCreateScenario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch('/api/wealth-forecast/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Failed to create scenario')
      return (await response.json()) as ForecastScenario
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.forecastScenarios() })
      toast.success('Scenario created')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteScenario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (scenarioId: string) => {
      const response = await fetch(`/api/wealth-forecast/scenarios/${scenarioId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete scenario')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.forecastScenarios() })
      toast.success('Scenario deleted')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      scenario_id: string
      name: string
      event_date: string
      event_type: string
      amount: number
      note: string | null
    }) => {
      const response = await fetch('/api/wealth-forecast/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Failed to create event')
      return (await response.json()) as ForecastEvent
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.forecastEvents(variables.scenario_id) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteEvent(scenarioId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/wealth-forecast/events/${eventId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete event')
    },
    onSuccess: () => {
      if (scenarioId) queryClient.invalidateQueries({ queryKey: queryKeys.forecastEvents(scenarioId) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
