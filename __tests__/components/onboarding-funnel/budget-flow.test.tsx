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
import { ensureAnonymousSession as _ensureAnonymousSession } from '@/lib/supabase/anonymous'
const ensureAnonymousSession = _ensureAnonymousSession as unknown as jest.Mock
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

  it('pre-selects the trims that close the gap and shows the fixed goal will be hit', () => {
    useFunnelStore.setState({
      budgetIncome: 10_000_000,
      savingsAmount: 2_500_000,
      budgetSpend: { housing: 2_000_000, food: 2_000_000, transport: 1_500_000, lifestyle: 3_000_000 },
    })
    render(<BudgetPlanPage />)

    // freeNow 1.5M, gap 1M → Lifestyle (−1.05M) alone covers it and is pre-checked.
    expect(
      screen.getByRole('button', { name: /Lifestyle & fun/i })
    ).toHaveAttribute('aria-pressed', 'true')
    // Primary takeaway: the fixed savings goal will be hit.
    expect(screen.getByText('budget.plan.willHitTitle')).toBeInTheDocument()
  })

  it('sticks to the savings goal and routes to /start/save from the conversion CTA (no DB write)', () => {
    useFunnelStore.setState({
      budgetIncome: 10_000_000,
      savingsAmount: 2_000_000,
      budgetSpend: { housing: 4_000_000, food: 2_000_000 },
    })
    render(<BudgetPlanPage />)

    // Already free to save the full target (freeNow 4M ≥ goal 2M) → on track;
    // the savings choice sticks to the goal, synced by an effect on render.
    expect(useFunnelStore.getState().budgetSavingsChoice).toBe(2_000_000)

    // The result screen is the conversion point: "Create free account" routes
    // straight to the signup form.
    fireEvent.click(screen.getByRole('button', { name: /createAccount/i }))
    expect(push).toHaveBeenCalledWith('/start/save')
  })
})
