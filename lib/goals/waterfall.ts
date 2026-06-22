import type { FinancialGoalDB } from '@/types/database'

export interface GoalWithSaved {
  goal: FinancialGoalDB
  saved: number
  isCompleted: boolean
}

/**
 * Balance-waterfall: an account's live balance fills its ACTIVE goals in order of
 * earliest target_date first (tie → created_at asc). Goal N only progresses once
 * goals 1..N-1 are fully funded. Returns goals in fill order with derived `saved`.
 */
export function computeGoalWaterfall(balance: number, goals: FinancialGoalDB[]): GoalWithSaved[] {
  const active = goals
    .filter((g) => g.status === 'active')
    .sort((a, b) => {
      if (a.target_date !== b.target_date) return a.target_date < b.target_date ? -1 : 1
      return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
    })

  let remaining = Math.max(0, balance)
  return active.map((goal) => {
    const target = Number(goal.target_amount)
    const saved = Math.min(remaining, target)
    remaining = Math.max(0, remaining - saved)
    return { goal, saved, isCompleted: saved >= target }
  })
}
