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

// Seeded categories: two EXPENSE rows + the "Savings transfer" TRANSFER row.
const CATEGORIES = [
  { id: 'cat-food', name: 'Food & Dining', group_type: 'EXPENSE' },
  { id: 'cat-bills', name: 'Bills & Utilities', group_type: 'EXPENSE' },
  { id: 'cat-savings', name: 'Savings transfer', group_type: 'TRANSFER' },
]
jest.mock('@/hooks/useTransactionCategories', () => ({
  useTransactionCategories: () => ({ categories: CATEGORIES, isLoading: false }),
}))

import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import BudgetIncomePage from '@/app/start/budget/income/page'
import BudgetSavingsPage from '@/app/start/budget/savings/page'
import BudgetSpendPage from '@/app/start/budget/spend/page'

describe('Budget-from-income flow', () => {
  beforeEach(() => {
    push.mockClear()
    ensureAnonymousSession.mockClear()
    saveOnboardingPlan.mockClear()
    advanceOnboarding.mockClear()
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

  it('See my plan saves the plan with a savings-transfer allocation, then routes to plan', async () => {
    useFunnelStore.setState({ budgetIncome: 10_000_000, savingsAmount: 2_000_000 })
    render(<BudgetSpendPage />)

    // The category rows appear once the (async) anonymous session resolves.
    const foodInput = await screen.findByTestId('budget-spend-cat-food')
    fireEvent.change(foodInput, { target: { value: '3000000' } })

    fireEvent.click(screen.getByRole('button', { name: /budget\.spend\.cta/i }))

    await waitFor(() => expect(saveOnboardingPlan).toHaveBeenCalledTimes(1))
    expect(saveOnboardingPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        monthly_income: 10_000_000,
        period: 'monthly',
        allocations: expect.arrayContaining([
          { category_id: 'cat-food', amount: 3_000_000 },
          { category_id: 'cat-savings', amount: 2_000_000 },
        ]),
      })
    )
    expect(advanceOnboarding).toHaveBeenCalledWith('plan')
    await waitFor(() => expect(push).toHaveBeenCalledWith('/start/budget/plan'))
  })
})
