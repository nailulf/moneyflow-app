import { planMerge } from '@/lib/onboarding/merge'

const base = {
  guest: {
    goal: { goal_type: 'emergency_fund', target_amount: 1000, target_date: null },
    plan: { period_type: 'monthly', monthly_income: 8_000_000,
            allocations: [{ categoryName: 'Food & Dining', group_type: 'EXPENSE', amount: 2_000_000 }] },
    categories: [{ id: 'g1', name: 'Food & Dining', group_type: 'EXPENSE' }],
  },
  existing: {
    defaultAccountId: 'accB',
    existingGoalAccountIds: [] as string[],
    existingPlanPeriods: [] as string[],
    categories: [{ id: 'b1', name: 'Food & Dining', group_type: 'EXPENSE' }],
  },
}

it('imports goal + plan and remaps categories when no conflicts', () => {
  const p = planMerge(base.guest, base.existing)
  expect(p.goal).toEqual({ action: 'import', account_id: 'accB' })
  expect(p.plan.action).toBe('import')
  expect(p.plan.allocations).toEqual([{ category_id: 'b1', amount: 2_000_000 }])
})

it('discards the goal when the existing default account already has one', () => {
  const p = planMerge(base.guest, { ...base.existing, existingGoalAccountIds: ['accB'] })
  expect(p.goal.action).toBe('discard')
})

it('discards the plan when the existing user already has a plan for that period', () => {
  const p = planMerge(base.guest, { ...base.existing, existingPlanPeriods: ['monthly'] })
  expect(p.plan.action).toBe('discard')
})

it('drops allocations whose category has no name match in the existing user', () => {
  const guest = { ...base.guest, plan: { ...base.guest.plan,
    allocations: [{ categoryName: 'Nonexistent', group_type: 'EXPENSE', amount: 500 }] } }
  const p = planMerge(guest, base.existing)
  expect(p.plan.allocations).toEqual([])
})

it('always discards account and categories', () => {
  const p = planMerge(base.guest, base.existing)
  expect(p.account.action).toBe('discard')
  expect(p.categories.action).toBe('discard')
})

it('handles a guest with no goal/plan (nulls)', () => {
  const p = planMerge({ goal: null, plan: null, categories: [] }, base.existing)
  expect(p.goal.action).toBe('discard')
  expect(p.plan.action).toBe('discard')
})
