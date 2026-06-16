import { create } from 'zustand'

/**
 * Goal types offered by the guest goal flow (design's 5 cards). These map to
 * the real `financial_goals.goal_type` enum on save: `custom` → `other`
 * (see lib/api/onboarding-funnel.ts). The store keeps the funnel-facing label.
 */
export type FunnelGoalType =
  | 'emergency_fund'
  | 'vacation'
  | 'gadget'
  | 'debt_payoff'
  | 'custom'

interface FunnelState {
  goalType?: FunnelGoalType
  targetAmount?: number
  /** 3 | 6 | 12 | custom value (months). Defaults to 12 in the UI. */
  horizonMonths?: number
  monthlyIncome?: number
  /** Sum of additional income sources (single optional number for now). */
  otherIncome?: number
  /** categoryId → monthly spend amount. */
  spend: Record<string, number>

  // ── Budget-from-income flow (Flow 2) ───────────────────────────────────────
  // Kept separate from the goal fields above so the two funnels never bleed
  // into each other (a user can switch intents without stale numbers).
  /** Monthly take-home income captured on /start/budget/income. */
  budgetIncome?: number
  /** Monthly savings target captured on /start/budget/savings. */
  savingsAmount?: number
  /** categoryId → estimated monthly spend, from /start/budget/spend. */
  budgetSpend: Record<string, number>

  setGoalType: (goalType: FunnelGoalType) => void
  setTargetAmount: (targetAmount: number) => void
  setHorizonMonths: (horizonMonths: number) => void
  setMonthlyIncome: (monthlyIncome: number) => void
  setOtherIncome: (otherIncome: number | undefined) => void
  setSpend: (categoryId: string, amount: number) => void
  setBudgetIncome: (budgetIncome: number) => void
  setSavingsAmount: (savingsAmount: number) => void
  setBudgetSpend: (categoryId: string, amount: number) => void
  reset: () => void
}

/**
 * In-memory store holding the guest funnel draft across the discrete
 * `/start/goal/*` routes. No persistence — a session-lived draft is enough;
 * the goal and plan are persisted server-side at the type/spend steps.
 */
export const useFunnelStore = create<FunnelState>((set) => ({
  horizonMonths: 12,
  spend: {},
  budgetSpend: {},

  setGoalType: (goalType) => set({ goalType }),
  setTargetAmount: (targetAmount) => set({ targetAmount }),
  setHorizonMonths: (horizonMonths) => set({ horizonMonths }),
  setMonthlyIncome: (monthlyIncome) => set({ monthlyIncome }),
  setOtherIncome: (otherIncome) => set({ otherIncome }),
  setSpend: (categoryId, amount) =>
    set((state) => ({ spend: { ...state.spend, [categoryId]: amount } })),
  setBudgetIncome: (budgetIncome) => set({ budgetIncome }),
  setSavingsAmount: (savingsAmount) => set({ savingsAmount }),
  setBudgetSpend: (categoryId, amount) =>
    set((state) => ({ budgetSpend: { ...state.budgetSpend, [categoryId]: amount } })),
  reset: () =>
    set({
      horizonMonths: 12,
      spend: {},
      budgetSpend: {},
      goalType: undefined,
      targetAmount: undefined,
      monthlyIncome: undefined,
      otherIncome: undefined,
      budgetIncome: undefined,
      savingsAmount: undefined,
    }),
}))
