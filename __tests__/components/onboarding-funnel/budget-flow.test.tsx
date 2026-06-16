import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
  useLocale: () => 'en',
}))

const ensureAnonymousSession = jest.fn(() => Promise.resolve('user-1'))
jest.mock('@/lib/supabase/anonymous', () => ({ ensureAnonymousSession }))

const saveOnboardingPlan = jest.fn(() => Promise.resolve({ plan: { id: 'p1' } }))
const advanceOnboarding = jest.fn(() => Promise.resolve({ onboarding: { current_phase: 'plan' } }))
jest.mock('@/lib/api/onboarding-funnel', () => ({
  saveOnboardingPlan,
  advanceOnboarding,
}))

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

// Seeded categories: the design's spend categories already exist plus the
// "Savings transfer" TRANSFER row. addCategory is mocked for find-or-create.
const addCategory = jest.fn((name: string) =>
  Promise.resolve(`new-${name.toLowerCase().replace(/\W+/g, '-')}`)
)
const CATEGORIES = [
  { id: 'cat-housing', name: 'Housing & rent', group_type: 'EXPENSE' },
  { id: 'cat-food', name: 'Food & groceries', group_type: 'EXPENSE' },
  { id: 'cat-savings', name: 'Savings transfer', group_type: 'TRANSFER' },
]
jest.mock('@/hooks/useTransactionCategories', () => ({
  useTransactionCategories: () => ({ categories: CATEGORIES, isLoading: false, addCategory }),
}))

import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import BudgetIncomePage from '@/app/start/budget/income/page'
import BudgetSavingsPage from '@/app/start/budget/savings/page'
import BudgetSpendPage from '@/app/start/budget/spend/page'
import BudgetPlanPage from '@/app/start/budget/plan/page'

describe('Budget-from-income flow', () => {
  beforeEach(() => {
    push.mockClear()
    ensureAnonymousSession.mockClear()
    saveOnboardingPlan.mockClear()
    advanceOnboarding.mockClear()
    addCategory.mockClear()
    useFunnelStore.getState().reset()
  })

  it('bootstraps the anonymous session on the income screen mount', () => {
    render(<BudgetIncomePage />)
    expect(ensureAnonymousSession).toHaveBeenCalledTimes(1)
  })

  it('disables Continue until income is set, then routes to savings', () => {
    render(<BudgetIncomePage />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()

    fireEvent.change(screen.getByTestId('budget-income'), { target: { value: '10000000' } })
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(push).toHaveBeenCalledWith('/start/budget/savings')
  })

  it('preset chip sets savings to a share of income, then Continue routes to spend', () => {
    useFunnelStore.setState({ budgetIncome: 10_000_000 })
    render(<BudgetSavingsPage />)

    // Continue blocked until a savings amount is chosen.
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()

    // Three preset chips (10/20/30%); the middle one is the 20% → 2,000,000 preset.
    const presets = screen.getAllByText('budget.savings.preset')
    fireEvent.click(presets[1])
    expect(useFunnelStore.getState().savingsAmount).toBe(2_000_000)

    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(push).toHaveBeenCalledWith('/start/budget/spend')
  })

  it('spend screen stores amounts by design key and routes to plan (no persistence yet)', () => {
    useFunnelStore.setState({ budgetIncome: 10_000_000, savingsAmount: 2_000_000 })
    render(<BudgetSpendPage />)

    fireEvent.change(screen.getByTestId('budget-spend-housing'), { target: { value: '4000000' } })
    expect(useFunnelStore.getState().budgetSpend.housing).toBe(4_000_000)

    // Spend does NOT persist — that happens on the plan screen's "Save my plan".
    expect(saveOnboardingPlan).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /budget\.spend\.cta/i }))
    expect(push).toHaveBeenCalledWith('/start/budget/plan')
  })

  it('plan screen defaults to On target = the savings goal', async () => {
    useFunnelStore.setState({
      budgetIncome: 10_000_000,
      savingsAmount: 2_000_000,
      budgetSpend: { housing: 4_000_000, food: 2_000_000 },
    })
    render(<BudgetPlanPage />)

    // The "On target" option is the recommended, pre-selected one.
    const onTarget = screen.getByRole('button', { name: /budget\.plan\.onTargetTitle/i })
    expect(onTarget).toHaveAttribute('aria-pressed', 'true')

    // Let the async ensureAnonymousSession effect settle before unmount.
    await waitFor(() => expect(ensureAnonymousSession).toHaveBeenCalled())
  })

  it('Save my plan persists the selected savings amount then routes to /start/save', async () => {
    useFunnelStore.setState({
      budgetIncome: 10_000_000,
      savingsAmount: 2_000_000,
      budgetSpend: { housing: 4_000_000, food: 2_000_000 },
    })
    render(<BudgetPlanPage />)

    fireEvent.click(screen.getByRole('button', { name: /budget\.plan\.saveCta/i }))

    await waitFor(() => expect(saveOnboardingPlan).toHaveBeenCalledTimes(1))
    expect(saveOnboardingPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        monthly_income: 10_000_000,
        period: 'monthly',
        allocations: expect.arrayContaining([
          { category_id: 'cat-housing', amount: 4_000_000 },
          // Default selection is "On target" = the 2,000,000 savings goal.
          { category_id: 'cat-savings', amount: 2_000_000 },
        ]),
      })
    )
    // The selected option's amount is mirrored into the store.
    expect(useFunnelStore.getState().budgetSavingsChoice).toBe(2_000_000)
    expect(advanceOnboarding).toHaveBeenCalledWith('plan')
    await waitFor(() => expect(push).toHaveBeenCalledWith('/start/save'))
  })

  it('Save my plan find-or-creates a missing spend category', async () => {
    useFunnelStore.setState({
      budgetIncome: 10_000_000,
      savingsAmount: 2_000_000,
      // "transport" is not in the seeded CATEGORIES → must be created.
      budgetSpend: { transport: 900_000 },
    })
    render(<BudgetPlanPage />)

    fireEvent.click(screen.getByRole('button', { name: /budget\.plan\.saveCta/i }))

    await waitFor(() => expect(saveOnboardingPlan).toHaveBeenCalledTimes(1))
    expect(addCategory).toHaveBeenCalledWith('Transport', 'EXPENSE')
    expect(saveOnboardingPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        allocations: expect.arrayContaining([
          { category_id: 'new-transport', amount: 900_000 },
        ]),
      })
    )
  })
})
