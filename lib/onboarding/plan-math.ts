export function monthlyContributionForGoal(target: number, months: number): number {
  if (months <= 0) return target
  return Math.ceil(target / months)
}

export function monthsToGoal(target: number, monthlySurplus: number): number {
  if (monthlySurplus <= 0) return Infinity
  return Math.ceil(target / monthlySurplus)
}

// ── Budget trim plan (design QlVbR) ──────────────────────────────────────────
// The budget flow keeps the savings TARGET fixed (set on /start/budget/savings)
// and, when the guest's current spending leaves too little free, suggests which
// categories to TRIM to free up the gap — instead of offering a lower target.

/** How much of a category we'd ever suggest trimming, keyed by spend slug. */
const TRIMMABILITY: Record<string, number> = {
  housing: 0, // rent is fixed — never suggested
  food: 0.15,
  transport: 0.2,
  bills: 0.15,
  lifestyle: 0.35, // most discretionary — trimmed hardest
}
/** Custom ("extra-N") categories: treat as moderately discretionary. */
const DEFAULT_TRIMMABILITY = 0.2
/** Round suggested trims to tidy, glanceable steps. */
const TRIM_ROUND = 50_000

export interface TrimSuggestion {
  slug: string
  name: string
  /** Current monthly amount for the category. */
  current: number
  /** Suggested cut (current − suggested), rounded to {@link TRIM_ROUND}. */
  trim: number
  /** Current − trim. */
  suggested: number
}

export interface BudgetTrimPlan {
  /** Income − total current spend, floored at 0. */
  freeNow: number
  /** Amount still needed to hit the savings goal: max(0, goal − freeNow). */
  gap: number
  /** Trimmable categories, largest suggested trim first (excludes 0-trim rows). */
  suggestions: TrimSuggestion[]
  /** Slugs pre-checked: the fewest largest trims that cover the gap. */
  preselected: string[]
  /** Whether the gap can be closed by trimming alone (Σ trims ≥ gap). */
  coverable: boolean
}

/**
 * Build the trim plan for the budget result screen. Pure & deterministic.
 *
 * Each category gets a suggested trim = round(amount × trimmability). Rows are
 * ordered largest-trim-first; the pre-selected set is the fewest of those whose
 * trims cumulatively cover the gap (greedy). Housing/rent is never suggested.
 */
export function buildBudgetTrimPlan({
  income,
  savingsGoal,
  categories,
}: {
  income: number
  savingsGoal: number
  categories: { slug: string; name: string; amount: number }[]
}): BudgetTrimPlan {
  const totalSpend = categories.reduce((sum, c) => sum + c.amount, 0)
  const freeNow = Math.max(0, income - totalSpend)
  const gap = Math.max(0, savingsGoal - freeNow)

  const suggestions: TrimSuggestion[] = categories
    .map((c) => {
      const pct = TRIMMABILITY[c.slug] ?? DEFAULT_TRIMMABILITY
      const trim = Math.round((c.amount * pct) / TRIM_ROUND) * TRIM_ROUND
      return { slug: c.slug, name: c.name, current: c.amount, trim, suggested: c.amount - trim }
    })
    .filter((s) => s.trim > 0)
    .sort((a, b) => b.trim - a.trim)

  const preselected: string[] = []
  if (gap > 0) {
    let acc = 0
    for (const s of suggestions) {
      if (acc >= gap) break
      preselected.push(s.slug)
      acc += s.trim
    }
  }

  const totalTrim = suggestions.reduce((sum, s) => sum + s.trim, 0)
  return { freeNow, gap, suggestions, preselected, coverable: totalTrim >= gap }
}

/** Savings-rate-based score: (income - spend) / income, clamped to 0-100. 50% savings rate => 100. */
export function healthScore({ income, spend }: { income: number; spend: number }): number {
  if (income <= 0) return 0
  const rate = (income - spend) / income
  return Math.max(0, Math.min(100, Math.round(rate * 200)))
}

export type HealthStatus = 'good' | 'watch' | 'low'

/** The four factors the design's breakdown card grades. */
export type HealthFactor = 'savingsRatio' | 'debtToIncome' | 'emergencyFund' | 'netWorth'

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
  /** Debt-to-income as a whole-number percent: monthly repayment / monthly income × 100. */
  debtToIncomePct: number
  /** Months of spending the emergency fund covers: savings / spending. */
  emergencyMonths: number
  /** Net worth in the same currency as the inputs: savings + investments − debt. */
  netWorth: number
  breakdown: Record<HealthFactor, HealthStatus>
}

/** Weights summing to 100 — drive the composite score. */
const WEIGHTS: Record<HealthFactor, number> = {
  savingsRatio: 35,
  emergencyFund: 25,
  debtToIncome: 25,
  netWorth: 15,
}

/** Map a status to the fraction of its weight earned. */
function statusFactor(status: HealthStatus): number {
  if (status === 'good') return 1
  if (status === 'watch') return 0.5
  return 0
}

/**
 * Pure, total financial-health assessment from a few self-reported numbers.
 *
 * Four factors (matching the result-screen breakdown card), each graded
 * good/watch/low, then weighted into a 0–100 score:
 * - savings ratio (35): good ≥20%, watch 1–19%, low ≤0%
 * - emergency fund (25): good ≥3 months covered, watch 1–3, low <1
 * - debt-to-income (25): monthly repayment / income — good ≤20%, watch 21–40%, low >40%
 * - net worth (15): savings + investments − debt — good if positive, watch if ~0, low if negative
 *
 * Non-positive income short-circuits to a score of 0.
 */
export function financialHealthScore(input: FinancialHealthInput): FinancialHealthResult {
  const { income, spending, savings, investments, debt, debtPayment } = input

  const netWorth = savings + investments - debt

  if (income <= 0) {
    return {
      score: 0,
      savingsRate: 0,
      debtToIncomePct: 0,
      emergencyMonths: 0,
      netWorth,
      breakdown: {
        savingsRatio: 'low',
        emergencyFund: 'low',
        debtToIncome: 'low',
        netWorth: netWorth > 0 ? 'good' : netWorth < 0 ? 'low' : 'watch',
      },
    }
  }

  // Savings ratio — share of income kept.
  const savingsRate = Math.round(((income - spending) / income) * 100)
  const savingsRatio: HealthStatus =
    savingsRate >= 20 ? 'good' : savingsRate >= 1 ? 'watch' : 'low'

  // Emergency fund — months of spending the savings cover.
  const emergencyMonths = spending > 0 ? savings / spending : savings > 0 ? Infinity : 0
  const emergencyFund: HealthStatus =
    emergencyMonths >= 3 ? 'good' : emergencyMonths >= 1 ? 'watch' : 'low'

  // Debt-to-income — share of monthly income going to debt repayment.
  const debtToIncomePct = Math.round((debtPayment / income) * 100)
  const debtToIncome: HealthStatus =
    debtPayment <= 0 || debtToIncomePct <= 20 ? 'good' : debtToIncomePct <= 40 ? 'watch' : 'low'

  // Net worth — assets minus liabilities.
  const netWorthStatus: HealthStatus = netWorth > 0 ? 'good' : netWorth < 0 ? 'low' : 'watch'

  const breakdown: Record<HealthFactor, HealthStatus> = {
    savingsRatio,
    emergencyFund,
    debtToIncome,
    netWorth: netWorthStatus,
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (Object.keys(WEIGHTS) as HealthFactor[]).reduce(
          (acc, factor) => acc + statusFactor(breakdown[factor]) * WEIGHTS[factor],
          0
        )
      )
    )
  )

  return {
    score,
    savingsRate,
    debtToIncomePct,
    emergencyMonths,
    netWorth,
    breakdown,
  }
}
