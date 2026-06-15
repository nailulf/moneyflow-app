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
        'goal.plan.perMonth': '/month',
        'goal.plan.incomeLabel': 'Income',
        'goal.plan.expensesLabel': 'Expenses',
        'goal.plan.achievable': 'Achievable',
        'goal.plan.tight': 'Tight',
        'goal.plan.saveCta': 'Save my plan',
        'goal.type.vacationTitle': 'Vacation / Trip',
        'goal.plan.reachIn': `Reach it in ${values?.months} months`,
        'goal.plan.goalLabel': `Goal: ${values?.name}`,
        'goal.plan.whatIfCut': `Cut spending by ${values?.amount} → ${values?.months} months`,
        'goal.plan.whatIfSide': `Add ${values?.amount} side income → ${values?.months} months`,
      }
      return labels[key] ?? key
    },
  useLocale: () => 'en',
}))

import { formatCurrency } from '@/lib/data-utils'
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
      otherIncome: 0,
      spend: { food: 3_000_000, transport: 1_100_000, fun: 2_000_000 },
    })
  })

  afterEach(() => act(() => useFunnelStore.getState().reset()))

  it('renders the computed surplus as the hero number', () => {
    render(<GoalPlanPage />)
    expect(screen.getByText(formatCurrency(2_400_000))).toBeInTheDocument()
  })

  it('shows the months-to-goal and an Achievable badge', () => {
    render(<GoalPlanPage />)
    expect(screen.getByText('Reach it in 5 months')).toBeInTheDocument()
    expect(screen.getByText('Achievable')).toBeInTheDocument()
  })

  it('pushes to /start/save when Save my plan is clicked', () => {
    render(<GoalPlanPage />)
    fireEvent.click(screen.getByRole('button', { name: /save my plan/i }))
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
