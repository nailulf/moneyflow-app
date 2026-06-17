import type { FunnelState, FunnelGoalType } from '@/lib/onboarding/funnel-store'
import type { OnboardingGoalType } from '@/lib/api/onboarding-funnel'
import { SPEND_SLUG_TO_NAME } from '@/lib/onboarding/spend-categories'

export interface OnboardingGoalDraft {
  goal_type: OnboardingGoalType
  name: string
  target_amount: number
  target_date: string // YYYY-MM-DD
}

export interface OnboardingDraft {
  goal?: OnboardingGoalDraft
  /** Category allocations resolved to canonical names; finalize find-or-creates. */
  allocations: { name: string; amount: number }[]
  period: 'monthly' | 'yearly'
}

/** Funnel goal type → DB goal_type. `custom` becomes `other`. */
const FUNNEL_TO_GOAL_TYPE: Record<FunnelGoalType, OnboardingGoalType> = {
  emergency_fund: 'emergency_fund',
  vacation: 'vacation',
  gadget: 'gadget',
  debt_payoff: 'debt_payoff',
  custom: 'other',
}

const GOAL_TYPE_LABELS: Record<OnboardingGoalType, string> = {
  emergency_fund: 'Emergency Fund', vacation: 'Vacation',
  house_down_payment: 'House Down Payment', car_purchase: 'Car Purchase',
  education: 'Education', wedding: 'Wedding', investment: 'Investment',
  other: 'Savings Goal', debt_payoff: 'Pay Off Debt', gadget: 'New Gadget',
}

function isoDatePlusMonths(now: Date, months: number): string {
  const d = new Date(now)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

/**
 * Build the registration-time draft from the in-memory funnel store. Picks the
 * budget flow's fields when present, else the goal flow's. Drops zero-amount
 * allocations; resolves slugs (core + custom) to canonical category names.
 */
export function buildOnboardingDraft(s: FunnelState, now: Date): OnboardingDraft {
  const isBudgetFlow =
    s.budgetIncome != null || Object.keys(s.budgetSpend).length > 0
  const spend = isBudgetFlow ? s.budgetSpend : s.spend

  const slugToName: Record<string, string> = { ...SPEND_SLUG_TO_NAME }
  for (const c of s.customCategories) slugToName[c.slug] = c.name

  const allocations = Object.entries(spend)
    .filter(([, amount]) => amount > 0)
    .map(([slug, amount]) => ({ name: slugToName[slug] ?? slug, amount }))

  if (isBudgetFlow && s.budgetSavingsChoice && s.budgetSavingsChoice > 0) {
    allocations.push({ name: 'Savings transfer', amount: s.budgetSavingsChoice })
  }

  const draft: OnboardingDraft = { allocations, period: 'monthly' }

  if (s.goalType && s.targetAmount && s.targetAmount > 0) {
    const goal_type = FUNNEL_TO_GOAL_TYPE[s.goalType]
    draft.goal = {
      goal_type,
      name: GOAL_TYPE_LABELS[goal_type],
      target_amount: s.targetAmount,
      target_date: isoDatePlusMonths(now, s.horizonMonths ?? 12),
    }
  }

  return draft
}
