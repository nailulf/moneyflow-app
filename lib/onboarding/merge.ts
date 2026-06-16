type GuestCat = { id: string; name: string; group_type: string }

type GuestPlan = {
  period_type: string
  monthly_income: number
  allocations: { categoryName: string; group_type: string; amount: number }[]
}

export type Guest = {
  goal: { goal_type: string; target_amount: number; target_date: string | null } | null
  plan: GuestPlan | null
  categories: GuestCat[]
}

export type Existing = {
  defaultAccountId: string
  existingGoalAccountIds: string[]
  existingPlanPeriods: string[]
  categories: GuestCat[]
}

/**
 * Pure, side-effect-free planner that decides how a guest's bounded data merges
 * into an existing account on conversion-conflict. No I/O, no Supabase.
 *
 * Rules:
 * - account: ALWAYS discard the guest's seeded default account.
 * - categories: ALWAYS discard (used only to remap allocation category names).
 * - plan: import ONLY if the existing user has no plan for that period; remap
 *   allocation categories to the existing user's categories by name+group_type;
 *   drop allocations with no name match.
 * - goal: import onto the existing default account ONLY if that account has no
 *   goal yet; else discard.
 */
export function planMerge(guest: Guest, existing: Existing) {
  const goal =
    guest.goal && !existing.existingGoalAccountIds.includes(existing.defaultAccountId)
      ? { action: 'import' as const, account_id: existing.defaultAccountId }
      : { action: 'discard' as const }

  let plan:
    | {
        action: 'import'
        period_type: string
        monthly_income: number
        allocations: { category_id: string; amount: number }[]
      }
    | { action: 'discard'; allocations: { category_id: string; amount: number }[] }
  if (guest.plan && !existing.existingPlanPeriods.includes(guest.plan.period_type)) {
    const byKey = new Map(existing.categories.map((c) => [`${c.name}|${c.group_type}`, c.id]))
    const allocations = guest.plan.allocations
      .map((a) => ({ id: byKey.get(`${a.categoryName}|${a.group_type}`), amount: a.amount }))
      .filter((a): a is { id: string; amount: number } => !!a.id)
      .map((a) => ({ category_id: a.id, amount: a.amount }))
    plan = {
      action: 'import',
      period_type: guest.plan.period_type,
      monthly_income: guest.plan.monthly_income,
      allocations,
    }
  } else {
    plan = { action: 'discard', allocations: [] }
  }

  return {
    account: { action: 'discard' as const },
    categories: { action: 'discard' as const },
    goal,
    plan,
  }
}
