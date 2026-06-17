import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
  useLocale: () => 'en',
}))

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

// BudgetIncomePage still calls ensureAnonymousSession to lazily bootstrap the
// guest session; mock it here so it doesn't try to reach Supabase.
jest.mock('@/lib/supabase/anonymous', () => ({
  ensureAnonymousSession: jest.fn(() => Promise.resolve('user-1')),
}))

import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous'
import BudgetIncomePage from '@/app/start/budget/income/page'
import BudgetSavingsPage from '@/app/start/budget/savings/page'
import BudgetSpendPage from '@/app/start/budget/spend/page'
import BudgetPlanPage from '@/app/start/budget/plan/page'

describe('Budget-from-income flow', () => {
  beforeEach(() => {
    push.mockClear()
    ensureAnonymousSession.mockClear()
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

  it('spend screen renders static categories immediately (no DB / loading state)', () => {
    useFunnelStore.setState({ budgetIncome: 10_000_000, savingsAmount: 2_000_000 })
    render(<BudgetSpendPage />)

    // Static categories render synchronously — no DB fetch, no loading spinner.
    expect(screen.getByTestId('budget-spend-housing')).toBeInTheDocument()
    expect(screen.getByTestId('budget-spend-food')).toBeInTheDocument()
    expect(screen.getByTestId('budget-spend-transport')).toBeInTheDocument()
    expect(screen.getByTestId('budget-spend-bills')).toBeInTheDocument()
    expect(screen.getByTestId('budget-spend-lifestyle')).toBeInTheDocument()
  })

  it('spend screen stores amounts by slug and routes to plan (no persistence)', () => {
    useFunnelStore.setState({ budgetIncome: 10_000_000, savingsAmount: 2_000_000 })
    render(<BudgetSpendPage />)

    const input = screen.getByTestId('budget-spend-housing')
    fireEvent.change(input, { target: { value: '4000000' } })
    expect(useFunnelStore.getState().budgetSpend['housing']).toBe(4_000_000)

    fireEvent.click(screen.getByRole('button', { name: /budget\.spend\.cta/i }))
    expect(push).toHaveBeenCalledWith('/start/budget/plan')
  })

  it('spend screen shows add-another inline input and appends custom category', async () => {
    useFunnelStore.setState({ budgetIncome: 10_000_000, savingsAmount: 2_000_000 })
    render(<BudgetSpendPage />)

    fireEvent.click(screen.getByRole('button', { name: /budget\.spend\.addCategory/i }))

    const input = screen.getByPlaceholderText(/budget\.spend\.newCategory/i)
    fireEvent.change(input, { target: { value: 'Pets' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(useFunnelStore.getState().customCategories).toEqual([
        { slug: 'extra-1', name: 'Pets' },
      ])
    )
    expect(screen.getByTestId('budget-spend-extra-1')).toBeInTheDocument()
  })

  it('plan screen defaults to On target = the savings goal', () => {
    useFunnelStore.setState({
      budgetIncome: 10_000_000,
      savingsAmount: 2_000_000,
      budgetSpend: { housing: 4_000_000, food: 2_000_000 },
    })
    render(<BudgetPlanPage />)

    // The "On target" option is the recommended, pre-selected one.
    const onTarget = screen.getByRole('button', { name: /budget\.plan\.onTargetTitle/i })
    expect(onTarget).toHaveAttribute('aria-pressed', 'true')
  })

  it('Save my plan records choice in store and routes to /start/save (no DB write)', () => {
    useFunnelStore.setState({
      budgetIncome: 10_000_000,
      savingsAmount: 2_000_000,
      budgetSpend: { housing: 4_000_000, food: 2_000_000 },
    })
    render(<BudgetPlanPage />)

    fireEvent.click(screen.getByRole('button', { name: /budget\.plan\.saveCta/i }))

    // The selected option's amount (On target = savings goal = 2,000,000) is
    // persisted into the store synchronously — no DB write.
    expect(useFunnelStore.getState().budgetSavingsChoice).toBe(2_000_000)
    expect(push).toHaveBeenCalledWith('/start/save')
  })
})
