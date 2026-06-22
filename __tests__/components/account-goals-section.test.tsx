import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({
  useTranslations: () => (k: string, v?: any) => (v?.pct ?? k),
  useLocale: () => 'en',
}))

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const mockUseAccountGoals = jest.fn()
jest.mock('@/hooks/useGoalsQuery', () => ({
  useAccountGoals: (accountId: string) => mockUseAccountGoals(accountId),
}))

// Stub AddGoalSheet so we don't pull in the create flow / contexts.
jest.mock('@/components/features/goals/AddGoalSheet', () => ({
  AddGoalSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-goal-sheet" /> : null,
}))

import { AccountGoalsSection } from '@/components/features/goals/AccountGoalsSection'

const account = {
  id: 'a1',
  type: 'BANK',
  currency: 'IDR',
  balance: 50000000,
  currentBalance: 50000000,
} as any

function mkGoal(id: string, name: string) {
  return {
    goal: {
      id,
      account_id: 'a1',
      name,
      goal_type: 'emergency_fund',
      target_amount: 30000000,
      target_date: '2026-12-31',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    saved: 15000000,
    isCompleted: false,
  }
}

it('renders both goal names and an add control when goals exist', () => {
  mockUseAccountGoals.mockReturnValue({
    data: [mkGoal('g1', 'Dana Darurat'), mkGoal('g2', 'Liburan')],
  })
  render(<AccountGoalsSection account={account} />)
  expect(screen.getByText('Dana Darurat')).toBeInTheDocument()
  expect(screen.getByText('Liburan')).toBeInTheDocument()
  expect(screen.getByText('add')).toBeInTheDocument()
})

it('renders the empty state when there are no goals', () => {
  mockUseAccountGoals.mockReturnValue({ data: [] })
  render(<AccountGoalsSection account={account} />)
  expect(screen.getByText('empty.title')).toBeInTheDocument()
})

it('returns null for an ineligible account type', () => {
  mockUseAccountGoals.mockReturnValue({ data: [] })
  const { container } = render(
    <AccountGoalsSection account={{ ...account, type: 'CREDIT_CARD' }} />
  )
  expect(container).toBeEmptyDOMElement()
})
