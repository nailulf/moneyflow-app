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

type CashflowResult = {
  median: number
  monthsUsed: number
  annualIncome: number
  annualExpenses: number
}

async function fetchMonthlyCashflow(): Promise<CashflowResult> {
  // Query Supabase directly to avoid API route auth issues
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const now = new Date()
  const startDate = new Date(now)
  startDate.setMonth(startDate.getMonth() - 12)
  startDate.setDate(1)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('date, amount, type')
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', now.toISOString().split('T')[0])
    .in('type', ['INCOME', 'EXPENSE'])
    .order('date', { ascending: true })

  if (!transactions || transactions.length === 0) {
    return { median: 0, monthsUsed: 0, annualIncome: 0, annualExpenses: 0 }
  }

  // Aggregate by month
  const monthlyMap = new Map<string, { income: number; expenses: number; count: number }>()
  for (const t of transactions) {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = monthlyMap.get(key) ?? { income: 0, expenses: 0, count: 0 }
    const amount = Math.abs(t.amount)
    if (t.type === 'INCOME') entry.income += amount
    else if (t.type === 'EXPENSE') entry.expenses += amount
    entry.count++
    monthlyMap.set(key, entry)
  }

  const months = Array.from(monthlyMap.values())
  const withData = months.filter((m) => m.count > 0)
  const source = withData.length >= 2 ? withData : months
  if (source.length === 0) {
    return { median: 0, monthsUsed: 0, annualIncome: 0, annualExpenses: 0 }
  }

  const avgMonthlyIncome = medianOf(source.map((m) => m.income))
  const avgMonthlyExpenses = medianOf(source.map((m) => m.expenses))

  return {
    median: medianOf(source.map((m) => m.income - m.expenses)),
    monthsUsed: source.length,
    annualIncome: avgMonthlyIncome * 12,
    annualExpenses: avgMonthlyExpenses * 12,
  }
}

async function fetchUserDOB(): Promise<string | null> {
  // Query Supabase directly — user_settings has RLS scoped to auth.uid()
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data } = await supabase
    .from('user_settings')
    .select('date_of_birth')
    .maybeSingle()
  return data?.date_of_birth ?? null
}

// --- Query hooks ---

export function useForecastUserDOB() {
  return useQuery({
    queryKey: ['forecast', 'dob'],
    queryFn: fetchUserDOB,
    staleTime: 5 * 60 * 1000, // 5 minutes — DOB rarely changes
  })
}

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
      details?: Record<string, unknown>
      is_enabled?: boolean
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

export function useUpdateEvent(scenarioId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ eventId, ...data }: {
      eventId: string
      name?: string
      event_date?: string
      event_type?: string
      amount?: number
      note?: string | null
      details?: Record<string, unknown>
      is_enabled?: boolean
    }) => {
      const response = await fetch(`/api/wealth-forecast/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update event')
      return (await response.json()) as ForecastEvent
    },
    onSuccess: () => {
      if (scenarioId) queryClient.invalidateQueries({ queryKey: queryKeys.forecastEvents(scenarioId) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useToggleEvent(scenarioId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ eventId, is_enabled }: { eventId: string; is_enabled: boolean }) => {
      const response = await fetch(`/api/wealth-forecast/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled }),
      })
      if (!response.ok) throw new Error('Failed to toggle event')
      return (await response.json()) as ForecastEvent
    },
    onSuccess: () => {
      if (scenarioId) queryClient.invalidateQueries({ queryKey: queryKeys.forecastEvents(scenarioId) })
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
