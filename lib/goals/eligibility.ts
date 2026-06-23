export const GOAL_ELIGIBLE_TYPES = ['BANK', 'DIGITAL_WALLET', 'CASH'] as const

export function canHaveGoal(accountType: string): boolean {
  return (GOAL_ELIGIBLE_TYPES as readonly string[]).includes(accountType)
}
