import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
  useLocale: () => 'en',
}))

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

// Reset the in-memory funnel store between tests.
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import GoalTypePage from '@/app/start/goal/type/page'
import GoalIncomePage from '@/app/start/goal/income/page'
import GoalSpendPage from '@/app/start/goal/spend/page'

// GoalIncomePage still calls ensureAnonymousSession to lazily bootstrap the
// guest session; mock it here so it doesn't try to reach Supabase.
const ensureAnonymousSession = jest.fn(() => Promise.resolve('user-1'))
jest.mock('@/lib/supabase/anonymous', () => ({ ensureAnonymousSession }))

describe('GoalTypePage', () => {
  beforeEach(() => {
    push.mockClear()
    useFunnelStore.getState().reset()
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

  it('routes to income screen immediately (no DB write)', () => {
    render(<GoalTypePage />)
    fireEvent.click(screen.getByTestId('goal-vacation'))
    fireEvent.change(screen.getByTestId('target-amount'), { target: { value: '5000000' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(push).toHaveBeenCalledWith('/start/goal/income')
    // Goal type + amount are in the store — no saveOnboardingGoal called.
    expect(useFunnelStore.getState().goalType).toBe('vacation')
    expect(useFunnelStore.getState().targetAmount).toBe(5_000_000)
  })

  it('stores custom goal type in the store without mapping to "other" enum', () => {
    render(<GoalTypePage />)
    fireEvent.click(screen.getByTestId('goal-custom'))
    fireEvent.change(screen.getByTestId('target-amount'), { target: { value: '1000000' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(useFunnelStore.getState().goalType).toBe('custom')
    expect(push).toHaveBeenCalledWith('/start/goal/income')
  })

  it('defaults to the vacation goal selected on mount', () => {
    render(<GoalTypePage />)
    expect(useFunnelStore.getState().goalType).toBe('vacation')
  })
})

describe('GoalIncomePage', () => {
  beforeEach(() => {
    push.mockClear()
    ensureAnonymousSession.mockClear()
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
    useFunnelStore.getState().reset()
  })

  it('renders the static spend categories without a loading state', () => {
    render(<GoalSpendPage />)
    // Static categories are rendered immediately (no DB wait)
    expect(screen.getByTestId('spend-housing')).toBeInTheDocument()
    expect(screen.getByTestId('spend-food')).toBeInTheDocument()
    expect(screen.getByTestId('spend-transport')).toBeInTheDocument()
    expect(screen.getByTestId('spend-bills')).toBeInTheDocument()
    expect(screen.getByTestId('spend-lifestyle')).toBeInTheDocument()
    expect(screen.queryByText('goal.spend.totalLabel')).not.toBeInTheDocument()
  })

  it('routes to /start/goal/plan on CTA click without DB calls', () => {
    render(<GoalSpendPage />)
    fireEvent.click(screen.getByRole('button', { name: /goal.spend.cta/i }))

    expect(push).toHaveBeenCalledWith('/start/goal/plan')
  })

  it('shows add-another category input and appends custom category', async () => {
    render(<GoalSpendPage />)
    fireEvent.click(screen.getByRole('button', { name: /goal.spend.addCategory/i }))

    const input = screen.getByPlaceholderText(/goal.spend.newCategory/i)
    fireEvent.change(input, { target: { value: 'Side hustle' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(useFunnelStore.getState().customCategories).toEqual([
        { slug: 'extra-1', name: 'Side hustle' },
      ])
    )
    expect(screen.getByTestId('spend-extra-1')).toBeInTheDocument()
  })
})
