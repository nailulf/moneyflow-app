// __tests__/lib/onboarding/build-draft.test.ts
import { buildOnboardingDraft } from '@/lib/onboarding/build-draft'
import type { FunnelState } from '@/lib/onboarding/funnel-store'

const base = {
  incomeSources: [], spend: {}, budgetSpend: {}, customCategories: [],
  horizonMonths: 12,
} as unknown as FunnelState
const NOW = new Date('2026-06-17T00:00:00Z')

describe('buildOnboardingDraft', () => {
  it('maps goal-flow spend slugs to canonical names and sums income', () => {
    const draft = buildOnboardingDraft({
      ...base, goalType: 'emergency_fund', targetAmount: 30_000_000, horizonMonths: 6,
      monthlyIncome: 8_000_000, incomeSources: [{ name: 'Side', amount: 2_000_000 }],
      spend: { housing: 3_000_000, food: 0 },
    } as FunnelState, NOW)

    expect(draft.goal).toEqual({
      goal_type: 'emergency_fund', name: 'Emergency Fund',
      target_amount: 30_000_000, target_date: '2026-12-17',
    })
    // zero-amount allocations dropped
    expect(draft.allocations).toEqual([{ name: 'Housing & rent', amount: 3_000_000 }])
  })

  it('maps custom extra slugs via customCategories', () => {
    const draft = buildOnboardingDraft({
      ...base, budgetIncome: 5_000_000,
      budgetSpend: { 'extra-1': 500_000 },
      customCategories: [{ slug: 'extra-1', name: 'Pets' }],
    } as FunnelState, NOW)
    expect(draft.allocations).toEqual([{ name: 'Pets', amount: 500_000 }])
  })

  it('books the budget savings choice against Savings transfer', () => {
    const draft = buildOnboardingDraft({
      ...base, budgetIncome: 5_000_000, budgetSpend: { food: 1_000_000 },
      budgetSavingsChoice: 1_500_000,
    } as FunnelState, NOW)
    expect(draft.allocations).toContainEqual({ name: 'Savings transfer', amount: 1_500_000 })
    expect(draft.allocations).toContainEqual({ name: 'Food & groceries', amount: 1_000_000 })
  })

  it('maps custom goal type to "other"', () => {
    const draft = buildOnboardingDraft({
      ...base, goalType: 'custom', targetAmount: 1_000_000,
    } as FunnelState, NOW)
    expect(draft.goal?.goal_type).toBe('other')
    expect(draft.goal?.name).toBe('Savings Goal')
  })

  it('returns empty allocations + no goal for an empty store', () => {
    const draft = buildOnboardingDraft(base, NOW)
    expect(draft.goal).toBeUndefined()
    expect(draft.allocations).toEqual([])
    expect(draft.period).toBe('monthly')
  })
})
