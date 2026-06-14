import type { Database } from "@/types/database"

export type ForecastScenario = Database["public"]["Tables"]["wealth_forecast_scenarios"]["Row"]
export type ForecastEvent = Database["public"]["Tables"]["wealth_forecast_events"]["Row"]
export type LifeEventCategory = ForecastEvent["event_type"]

// --- Category-specific detail schemas ---

export type PropertyDetails = {
  home_price: number
  payment_type: 'loan' | 'cash'
  down_payment_pct: number
  loan_term_years: number
  interest_rate: number // annual decimal, e.g. 0.065 for 6.5%
}

export type WeddingDetails = {
  total_cost: number
}

export type KidsDetails = {
  annual_cost: number
  end_age: number // default 18
}

export type EducationDetails = {
  annual_tuition: number
  duration_years: number
}

export type HajjDetails = {
  total_cost: number
}

export type VehicleDetails = {
  price: number
  payment_type: 'loan' | 'cash'
  down_payment_pct: number
  loan_term_years: number
  interest_rate: number
}

export type RetirementDetails = {
  post_retirement_monthly_expense?: number
}

export type OtherDetails = {
  total_cost: number
  is_recurring: boolean
  recurring_years: number
}

export type EventDetailsMap = {
  PROPERTY: PropertyDetails
  WEDDING: WeddingDetails
  KIDS: KidsDetails
  EDUCATION: EducationDetails
  HAJJ: HajjDetails
  VEHICLE: VehicleDetails
  RETIREMENT: RetirementDetails
  OTHER: OtherDetails
}

export const LIFE_EVENT_CATEGORIES: { value: LifeEventCategory; label: string; templateLabel: string; icon: string }[] = [
  { value: "PROPERTY", label: "Property", templateLabel: "Buy a home", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" },
  { value: "WEDDING", label: "Wedding", templateLabel: "Plan a wedding", icon: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" },
  { value: "KIDS", label: "Kids", templateLabel: "Have a kid", icon: "M12 2a5 5 0 015 5v1a5 5 0 01-10 0V7a5 5 0 015-5zM20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" },
  { value: "EDUCATION", label: "Education", templateLabel: "College savings", icon: "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" },
  { value: "HAJJ", label: "Hajj", templateLabel: "Hajj pilgrimage", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" },
  { value: "VEHICLE", label: "Vehicle", templateLabel: "Buy a vehicle", icon: "M5 17h14M5 17a2 2 0 01-2-2V9h2l2-4h10l2 4h2v6a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4z" },
  { value: "RETIREMENT", label: "Retirement", templateLabel: "Plan retirement", icon: "M17.5 19H9a7 7 0 110-14h8.5M21 12l-4-4m4 4l-4 4" },
  { value: "OTHER", label: "Other", templateLabel: "Custom event", icon: "M12 5v14M5 12h14" },
]

export const LIFE_EVENT_COLORS: Record<LifeEventCategory, string> = {
  WEDDING: "hsl(var(--chart-1))",
  KIDS: "hsl(var(--chart-2))",
  EDUCATION: "hsl(var(--chart-3))",
  PROPERTY: "hsl(var(--chart-4))",
  HAJJ: "hsl(var(--chart-5, 280 65% 60%))",
  VEHICLE: "hsl(var(--muted-foreground))",
  RETIREMENT: "hsl(var(--success, 142 71% 45%))",
  OTHER: "hsl(var(--destructive))",
}

export type NetWorthDataPoint = {
  date: string
  value: number
}

export type NetWorthResponse = {
  currentNetWorth: number
  netWorthData?: NetWorthDataPoint[]
}

export type MonthlyDataPoint = {
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  transactionCount: number
}

export type MonthlyCashflowResponse = {
  monthlyData: MonthlyDataPoint[]
  summary?: {
    averageIncome: number
    averageExpenses: number
    averageNetCashFlow: number
  }
}

export type EventDetail = {
  name: string
  type: string
  amount: number
}

export type ProjectionPoint = {
  date: string
  ageLabel: string
  monthKey: string
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  deterministic: number
  hasEvent: boolean
  eventTypes: string[]
  eventDetails: EventDetail[]
  eventSpending?: number
}

export type ScenarioDraft = {
  name: string
  description: string | null
  start_date: string
  horizon_years: number
  expected_annual_return: number
  annual_volatility: number
  inflation_rate: number
  monthly_contribution: number
  monthly_withdrawal: number
  include_cashflow: boolean
  is_default: boolean
  target_net_worth: number
}

export type MonteCarloResult = {
  series: number[][]
  finalValues: number[]
}

export type ComparisonRow = {
  id: string
  name: string
  endValue: number
  isDefault: boolean
  successRate: number
}

export const defaultScenarioPayload = {
  name: "Base Scenario",
  description: "Default forecast",
  start_date: new Date().toISOString().split("T")[0],
  horizon_years: 10,
  expected_annual_return: 0.07,
  annual_volatility: 0.12,
  inflation_rate: 0.03,
  monthly_contribution: 0,
  monthly_withdrawal: 0,
  include_cashflow: true,
  is_default: true,
  target_net_worth: 0,
}

export const buildDraft = (scenario: ForecastScenario): ScenarioDraft => ({
  name: scenario.name,
  description: scenario.description,
  start_date: scenario.start_date,
  horizon_years: scenario.horizon_years,
  expected_annual_return: Number(scenario.expected_annual_return),
  annual_volatility: Number(scenario.annual_volatility),
  inflation_rate: Number(scenario.inflation_rate),
  monthly_contribution: Number(scenario.monthly_contribution),
  monthly_withdrawal: Number(scenario.monthly_withdrawal),
  include_cashflow: scenario.include_cashflow,
  is_default: scenario.is_default,
  target_net_worth: Number(scenario.target_net_worth),
})

export const toPercent = (value: number): number => Number((value * 100).toFixed(2))
export const fromPercent = (value: number): number => value / 100
