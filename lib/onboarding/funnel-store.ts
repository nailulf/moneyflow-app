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

/** A named extra income stream the guest adds on the goal income screen. */
export interface IncomeSource {
  name: string
  amount: number
}

export interface FunnelState {
  goalType?: FunnelGoalType
  targetAmount?: number
  /** 3 | 6 | 12 | custom value (months). Defaults to 12 in the UI. */
  horizonMonths?: number
  monthlyIncome?: number
  /** Named extra income streams; total income = main + sum(sources). */
  incomeSources: IncomeSource[]
  /**
   * Goal-flow monthly spend estimates, keyed by slug
   * ('housing' | 'food' | 'transport' | 'bills' | 'lifestyle' | 'extra-N').
   * Mapped to real categories only at registration (finalize).
   */
  spend: Record<string, number>

  // ── Budget-from-income flow (Flow 2) ───────────────────────────────────────
  // Kept separate from the goal fields above so the two funnels never bleed
  // into each other (a user can switch intents without stale numbers).
  /** Monthly take-home income captured on /start/budget/income. */
  budgetIncome?: number
  /** Monthly savings target captured on /start/budget/savings. */
  savingsAmount?: number
  /**
   * Estimated monthly spend from /start/budget/spend, keyed by slug
   * ('housing' | 'food' | 'transport' | 'bills' | 'lifestyle' | 'extra-N').
   * Slugs are mapped to real categories (find-or-create) only at registration
   * (finalize). Core slugs resolve via SPEND_SLUG_TO_NAME; custom 'extra-N'
   * slugs resolve via customCategories.
   */
  budgetSpend: Record<string, number>
  /** User-added spend rows beyond the static core list; slug = `extra-{n}`. */
  customCategories: { slug: string; name: string }[]
  /**
   * The savings amount of the option selected on /start/budget/plan
   * (Relaxed / On target / Ambitious). Persisted as the plan's savings
   * allocation when the user taps "Save my plan".
   */
  budgetSavingsChoice?: number

  setGoalType: (goalType: FunnelGoalType) => void
  setTargetAmount: (targetAmount: number) => void
  setHorizonMonths: (horizonMonths: number) => void
  setMonthlyIncome: (monthlyIncome: number) => void
  addIncomeSource: (source: IncomeSource) => void
  removeIncomeSource: (index: number) => void
  setSpend: (categoryId: string, amount: number) => void
  setBudgetIncome: (budgetIncome: number) => void
  setSavingsAmount: (savingsAmount: number) => void
  setBudgetSpend: (categoryId: string, amount: number) => void
  setBudgetSavingsChoice: (budgetSavingsChoice: number) => void
  addCustomCategory: (name: string) => void
  reset: () => void
}

/**
 * In-memory store holding the guest funnel draft across the discrete
 * `/start/goal/*` routes. No persistence — a session-lived draft is enough;
 * the goal and plan are persisted server-side at the type/spend steps.
 */
export const useFunnelStore = create<FunnelState>((set) => ({
  horizonMonths: 12,
  incomeSources: [],
  spend: {},
  budgetSpend: {},
  customCategories: [],

  setGoalType: (goalType) => set({ goalType }),
  setTargetAmount: (targetAmount) => set({ targetAmount }),
  setHorizonMonths: (horizonMonths) => set({ horizonMonths }),
  setMonthlyIncome: (monthlyIncome) => set({ monthlyIncome }),
  addIncomeSource: (source) =>
    set((state) => ({ incomeSources: [...state.incomeSources, source] })),
  removeIncomeSource: (index) =>
    set((state) => ({ incomeSources: state.incomeSources.filter((_, i) => i !== index) })),
  setSpend: (categoryId, amount) =>
    set((state) => ({ spend: { ...state.spend, [categoryId]: amount } })),
  setBudgetIncome: (budgetIncome) => set({ budgetIncome }),
  setSavingsAmount: (savingsAmount) => set({ savingsAmount }),
  setBudgetSpend: (categoryId, amount) =>
    set((state) => ({ budgetSpend: { ...state.budgetSpend, [categoryId]: amount } })),
  setBudgetSavingsChoice: (budgetSavingsChoice) => set({ budgetSavingsChoice }),
  addCustomCategory: (name) =>
    set((state) => ({
      customCategories: [
        ...state.customCategories,
        { slug: `extra-${state.customCategories.length + 1}`, name },
      ],
    })),
  reset: () =>
    set({
      horizonMonths: 12,
      incomeSources: [],
      spend: {},
      budgetSpend: {},
      customCategories: [],
      goalType: undefined,
      targetAmount: undefined,
      monthlyIncome: undefined,
      budgetIncome: undefined,
      savingsAmount: undefined,
      budgetSavingsChoice: undefined,
    }),
}))
