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
