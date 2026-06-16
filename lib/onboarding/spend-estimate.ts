/**
 * Smart spend pre-fill for the onboarding funnel (design n8X4lA / tAKTn —
 * "Estimate is okay. Tap an amount to adjust it").
 *
 * Instead of starting every category at 0 (a blank-slate effort spike before
 * the payoff), the spend step pre-fills an income-proportional estimate per
 * category so the result/plan screen computes a real surplus immediately.
 *
 * Ratios are keyed by the post-migration-056 seeded canonical category names.
 * Anything else falls back to a small default share.
 */

/** Share of monthly income to estimate for each canonical seeded category. */
const SPEND_RATIOS: Record<string, number> = {
  'Housing & rent': 0.28,
  'Food & groceries': 0.2,
  Transport: 0.1,
  'Bills & subscriptions': 0.08,
  'Lifestyle & fun': 0.12,
}

/** Default share for any category not in {@link SPEND_RATIOS}. */
const DEFAULT_RATIO = 0.05

/** Round to the nearest 50,000 for tidy, glanceable estimates. */
const ROUND_TO = 50_000

/**
 * Estimate a monthly spend amount for `categoryName` given monthly `income`.
 * Returns `round(income * ratio)` snapped to the nearest 50,000. Non-positive
 * income yields 0 (nothing sensible to estimate from).
 */
export function estimateSpend(categoryName: string, income: number): number {
  if (!Number.isFinite(income) || income <= 0) return 0
  const ratio = SPEND_RATIOS[categoryName] ?? DEFAULT_RATIO
  return Math.round((income * ratio) / ROUND_TO) * ROUND_TO
}
