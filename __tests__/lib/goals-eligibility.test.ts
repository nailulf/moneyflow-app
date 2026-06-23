import { canHaveGoal } from '@/lib/goals/eligibility'

it('allows transactional accounts only', () => {
  expect(canHaveGoal('BANK')).toBe(true)
  expect(canHaveGoal('DIGITAL_WALLET')).toBe(true)
  expect(canHaveGoal('CASH')).toBe(true)
  expect(canHaveGoal('INVESTMENT')).toBe(false)
  expect(canHaveGoal('PROPERTY')).toBe(false)
  expect(canHaveGoal('MORTGAGE')).toBe(false)
})
