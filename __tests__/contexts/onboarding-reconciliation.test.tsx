import { reconcileOnboarding } from '@/contexts/OnboardingContext'

describe('reconcileOnboarding (guest funnel)', () => {
  it('does NOT mark a fresh guest complete just because seeded account+categories exist', () => {
    const next = reconcileOnboarding({
      state: { current_phase: 'goal_setup', is_completed: false, is_skipped: false } as never,
      hasSeededAccount: true, hasCategories: true, hasUserCreatedPlan: false,
    })
    expect(next.markComplete).toBe(false)
  })
  it('marks complete once a saved plan exists and the user reached conversion/completed', () => {
    const next = reconcileOnboarding({
      state: { current_phase: 'completed', is_completed: false, is_skipped: false } as never,
      hasSeededAccount: true, hasCategories: true, hasUserCreatedPlan: true,
    })
    expect(next.markComplete).toBe(true)
  })
  it('does not re-complete an already-completed or skipped state', () => {
    expect(reconcileOnboarding({ state: { current_phase: 'completed', is_completed: true, is_skipped: false } as never, hasSeededAccount: true, hasCategories: true, hasUserCreatedPlan: true }).markComplete).toBe(false)
    expect(reconcileOnboarding({ state: { current_phase: 'goal_setup', is_completed: false, is_skipped: true } as never, hasSeededAccount: true, hasCategories: true, hasUserCreatedPlan: false }).markComplete).toBe(false)
  })
})
