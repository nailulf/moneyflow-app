import { ONBOARDING_PHASES, getNextPhase, getPreviousPhase } from '@/lib/api/onboarding'
describe('onboarding phase machine (guest funnel)', () => {
  it('orders the guest funnel phases', () => {
    expect(ONBOARDING_PHASES).toEqual(['intent', 'goal_setup', 'plan', 'conversion', 'completed'])
  })
  it('advances intent -> goal_setup', () => { expect(getNextPhase('intent')).toBe('goal_setup') })
  it('returns null after completed', () => { expect(getNextPhase('completed')).toBeNull() })
  it('goes back plan -> goal_setup', () => { expect(getPreviousPhase('plan')).toBe('goal_setup') })
})
