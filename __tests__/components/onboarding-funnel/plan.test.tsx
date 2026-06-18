import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// Interpolating translation mock so {months}/{amount} placeholders resolve.
jest.mock('next-intl', () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) => {
      const labels: Record<string, string> = {
        'goal.plan.savePill': 'You can save',
        'goal.plan.perMonth': '/month',
        'goal.plan.incomeLabel': 'Income',
        'goal.plan.expensesLabel': 'Expenses',
        'goal.plan.achievable': 'Achievable',
        'goal.plan.tight': 'Tight',
        'goal.plan.saveCta': 'Save my plan',
        'goal.type.vacationTitle': 'Vacation / Trip',
        'goal.plan.reachIn': `Reach it in ~${values?.months} months · ${values?.date}`,
        'goal.plan.goalLabel': `Goal: ${values?.name}`,
        'goal.plan.whatIfTitle': 'What if?',
        'goal.plan.whatIfCut': `Cut lifestyle by ${values?.amount}`,
        'goal.plan.whatIfSide': `Add side income ${values?.amount}`,
        'goal.plan.whatIfMonths': `${values?.months} months`,
      }
      return labels[key] ?? key
    },
  useLocale: () => 'en',
}))

import { formatCurrencyWhole } from '@/lib/data-utils'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import GoalPlanPage from '@/app/start/goal/plan/page'

describe('GoalPlanPage', () => {
  beforeEach(() => {
    push.mockClear()
    // Populated draft: target 12_000_000, horizon 6, income 8_500_000,
    // spend summing 6_100_000 → surplus 2_400_000, months = ceil(12M/2.4M) = 5,
    // achievable since 5 <= 6.
    useFunnelStore.setState({
      goalType: 'vacation',
      targetAmount: 12_000_000,
      horizonMonths: 6,
      monthlyIncome: 8_500_000,
      incomeSources: [],
      spend: { food: 3_000_000, transport: 1_100_000, fun: 2_000_000 },
    })
  })

  afterEach(() => act(() => useFunnelStore.getState().reset()))

  it('renders the computed surplus as the hero number', () => {
    render(<GoalPlanPage />)
    expect(screen.getByText(formatCurrencyWhole(2_400_000))).toBeInTheDocument()
  })

  it('shows the months-to-goal and an Achievable badge', () => {
    render(<GoalPlanPage />)
    expect(screen.getByText(/Reach it in ~5 months/)).toBeInTheDocument()
    expect(screen.getByText('Achievable')).toBeInTheDocument()
  })

  it('counts named income sources toward the surplus', () => {
    // +1.6M from a side source pushes surplus to 4_000_000.
    act(() =>
      useFunnelStore.setState({
        incomeSources: [{ name: 'Freelance', amount: 1_600_000 }],
      })
    )
    render(<GoalPlanPage />)
    expect(screen.getByText(formatCurrencyWhole(4_000_000))).toBeInTheDocument()
  })

  it('renders a What if? card with right-aligned month pills', () => {
    render(<GoalPlanPage />)
    expect(screen.getByText('What if?')).toBeInTheDocument()
    // Two suggestion rows → two month pills.
    expect(screen.getAllByText(/months$/).length).toBeGreaterThanOrEqual(2)
  })

  it('pushes to /start/save when Create free account is clicked (result is the conversion point)', () => {
    render(<GoalPlanPage />)
    fireEvent.click(screen.getByRole('button', { name: /createAccount/i }))
    expect(push).toHaveBeenCalledWith('/start/save')
  })

  it('shows a gentle empty state when there is no draft', () => {
    act(() => useFunnelStore.getState().reset())
    render(<GoalPlanPage />)
    // Empty state CTA routes back to the goal-type screen.
    fireEvent.click(screen.getByRole('button', { name: /goal.plan.emptyCta/i }))
    expect(push).toHaveBeenCalledWith('/start/goal/type')
  })
})
