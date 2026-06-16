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

const saveOnboardingGoal = jest.fn(() => Promise.resolve({ goal: { id: 'g1', account_id: 'a1' } }))
const saveOnboardingPlan = jest.fn(() => Promise.resolve({ plan: { id: 'p1' } }))
const advanceOnboarding = jest.fn(() => Promise.resolve({ onboarding: { current_phase: 'goal_setup' } }))
jest.mock('@/lib/api/onboarding-funnel', () => ({
  saveOnboardingGoal,
  saveOnboardingPlan,
  advanceOnboarding,
}))

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

jest.mock('@/hooks/useTransactionCategories', () => ({
  useTransactionCategories: () => ({
    categories: [
      { id: 'food', name: 'Food', group_type: 'EXPENSE' },
      { id: 'transport', name: 'Transport', group_type: 'EXPENSE' },
    ],
    isLoading: false,
  }),
}))

// Reset the in-memory funnel store between tests.
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import GoalTypePage from '@/app/start/goal/type/page'
import GoalIncomePage from '@/app/start/goal/income/page'
import GoalSpendPage from '@/app/start/goal/spend/page'

describe('GoalTypePage', () => {
  beforeEach(() => {
    push.mockClear()
    ensureAnonymousSession.mockClear()
    saveOnboardingGoal.mockClear()
    advanceOnboarding.mockClear()
    useFunnelStore.getState().reset()
  })

  it('creates the anonymous session on mount', () => {
    render(<GoalTypePage />)
    expect(ensureAnonymousSession).toHaveBeenCalledTimes(1)
  })

  it('disables Continue until a goal type and target are set', () => {
    render(<GoalTypePage />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()

    fireEvent.click(screen.getByTestId('goal-vacation'))
    // Type-only is not enough — target is still missing.
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()

    fireEvent.change(screen.getByTestId('target-amount'), { target: { value: '5000000' } })
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
  })

  it('saves the goal then routes to the income screen', async () => {
    render(<GoalTypePage />)
    fireEvent.click(screen.getByTestId('goal-vacation'))
    fireEvent.change(screen.getByTestId('target-amount'), { target: { value: '5000000' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(saveOnboardingGoal).toHaveBeenCalledTimes(1))
    expect(saveOnboardingGoal).toHaveBeenCalledWith(
      expect.objectContaining({ goal_type: 'vacation', target_amount: 5000000 })
    )
    expect(advanceOnboarding).toHaveBeenCalledWith('goal_setup')
    await waitFor(() => expect(push).toHaveBeenCalledWith('/start/goal/income'))
  })

  it('maps the custom goal type to the "other" enum on save', async () => {
    render(<GoalTypePage />)
    fireEvent.click(screen.getByTestId('goal-custom'))
    fireEvent.change(screen.getByTestId('target-amount'), { target: { value: '1000000' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(saveOnboardingGoal).toHaveBeenCalledTimes(1))
    expect(saveOnboardingGoal).toHaveBeenCalledWith(
      expect.objectContaining({ goal_type: 'other' })
    )
  })

  it('defaults to the vacation goal selected on mount', () => {
    render(<GoalTypePage />)
    expect(useFunnelStore.getState().goalType).toBe('vacation')
  })
})

describe('GoalIncomePage', () => {
  beforeEach(() => {
    push.mockClear()
    useFunnelStore.getState().reset()
  })

  it('disables Continue until main income is set', () => {
    render(<GoalIncomePage />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    fireEvent.change(screen.getByTestId('monthly-income'), { target: { value: '8000000' } })
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
  })

  it('adds a named income source to the store', () => {
    render(<GoalIncomePage />)
    fireEvent.click(screen.getByTestId('add-source'))
    fireEvent.change(screen.getByTestId('source-name'), { target: { value: 'Freelance' } })
    fireEvent.change(screen.getByTestId('source-amount'), { target: { value: '1500000' } })
    fireEvent.click(screen.getByTestId('confirm-source'))

    expect(useFunnelStore.getState().incomeSources).toEqual([
      { name: 'Freelance', amount: 1_500_000 },
    ])
  })
})

describe('GoalSpendPage', () => {
  beforeEach(() => {
    push.mockClear()
    saveOnboardingPlan.mockClear()
    advanceOnboarding.mockClear()
    useFunnelStore.getState().reset()
  })

  it('renders categories without a Total expenses row', async () => {
    render(<GoalSpendPage />)
    expect(await screen.findByLabelText('Food')).toBeInTheDocument()
    expect(screen.queryByText('goal.spend.totalLabel')).not.toBeInTheDocument()
  })

  it('saves total income including named sources', async () => {
    useFunnelStore.setState({
      monthlyIncome: 8_000_000,
      incomeSources: [{ name: 'Rent', amount: 2_000_000 }],
    })
    render(<GoalSpendPage />)
    fireEvent.change(await screen.findByLabelText('Food'), { target: { value: '1000000' } })
    fireEvent.click(screen.getByRole('button', { name: /goal.spend.cta/i }))

    await waitFor(() => expect(saveOnboardingPlan).toHaveBeenCalledTimes(1))
    expect(saveOnboardingPlan).toHaveBeenCalledWith(
      expect.objectContaining({ monthly_income: 10_000_000 })
    )
  })
})
