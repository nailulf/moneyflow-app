export function monthlyContributionForGoal(target: number, months: number): number {
  if (months <= 0) return target
  return Math.ceil(target / months)
}

export function monthsToGoal(target: number, monthlySurplus: number): number {
  if (monthlySurplus <= 0) return Infinity
  return Math.ceil(target / monthlySurplus)
}

/** Savings-rate-based score: (income - spend) / income, clamped to 0-100. 50% savings rate => 100. */
export function healthScore({ income, spend }: { income: number; spend: number }): number {
  if (income <= 0) return 0
  const rate = (income - spend) / income
  return Math.max(0, Math.min(100, Math.round(rate * 200)))
}

export type HealthStatus = 'good' | 'watch' | 'low'

export interface FinancialHealthInput {
  income: number
  spending: number
  savings: number
  investments: number
  debt: number
  debtPayment: number
}

export interface FinancialHealthResult {
  /** Composite financial-health score, 0–100. */
  score: number
  /** Monthly savings rate as a whole-number percent: (income − spending) / income × 100. */
  savingsRate: number
  /** Months of spending the emergency fund covers: savings / spending. */
  emergencyMonths: number
  breakdown: {
    netSavings: HealthStatus
    emergencyFund: HealthStatus
    investing: HealthStatus
    debt: HealthStatus
  }
}

/** Weights summing to 100 — drive the composite score. */
const WEIGHTS = {
  savingsRate: 35,
  emergencyFund: 25,
  debt: 25,
  investing: 15,
} as const

/** Map a status to the fraction of its weight earned. */
function statusFactor(status: HealthStatus): number {
  if (status === 'good') return 1
  if (status === 'watch') return 0.5
  return 0
}

/**
 * Pure, total financial-health assessment from a few self-reported numbers.
 *
 * Four factors, each graded good/watch/low, then weighted into a 0–100 score:
 * - savings rate (35): good ≥20%, watch 1–19%, low ≤0%
 * - emergency fund (25): good ≥3 months covered, watch 1–3, low <1
 * - debt (25): debt-to-annual-income — good <0.5, watch <1.0, low ≥1.0 (none ⇒ good)
 * - investing (15): good if investments > 0, else low
 *
 * Non-positive income short-circuits to a score of 0.
 */
export function financialHealthScore(input: FinancialHealthInput): FinancialHealthResult {
  const { income, spending, savings, investments, debt } = input

  if (income <= 0) {
    return {
      score: 0,
      savingsRate: 0,
      emergencyMonths: 0,
      breakdown: { netSavings: 'low', emergencyFund: 'low', investing: 'low', debt: 'low' },
    }
  }

  // Savings rate
  const savingsRate = Math.round(((income - spending) / income) * 100)
  const netSavings: HealthStatus =
    savingsRate >= 20 ? 'good' : savingsRate >= 1 ? 'watch' : 'low'

  // Emergency fund (months of spending covered)
  const emergencyMonths = spending > 0 ? savings / spending : savings > 0 ? Infinity : 0
  const emergencyFund: HealthStatus =
    emergencyMonths >= 3 ? 'good' : emergencyMonths >= 1 ? 'watch' : 'low'

  // Investing
  const investing: HealthStatus = investments > 0 ? 'good' : 'low'

  // Debt — relative to annual income
  const annualIncome = income * 12
  const debtToIncome = annualIncome > 0 ? debt / annualIncome : 0
  const debtStatus: HealthStatus =
    debt <= 0 || debtToIncome < 0.5 ? 'good' : debtToIncome < 1.0 ? 'watch' : 'low'

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        statusFactor(netSavings) * WEIGHTS.savingsRate +
          statusFactor(emergencyFund) * WEIGHTS.emergencyFund +
          statusFactor(debtStatus) * WEIGHTS.debt +
          statusFactor(investing) * WEIGHTS.investing
      )
    )
  )

  return {
    score,
    savingsRate,
    emergencyMonths,
    breakdown: { netSavings, emergencyFund, investing, debt: debtStatus },
  }
}
