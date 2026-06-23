import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({
  useTranslations: () => (k: string, v?: any) =>
    v ? `${k}:${Object.values(v).join(',')}` : k,
  useLocale: () => 'en',
}))
jest.mock('next/navigation', () => ({
  useParams: () => ({ goalId: 'goal-1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}))
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
jest.mock('@/hooks/useTransactionsQuery', () => ({
  useAllTransactions: () => ({ transactions: [], isLoading: false }),
}))
jest.mock('@/hooks/useGoalsQuery', () => ({
  useGoal: () => ({
    data: {
      goal: {
        id: 'goal-1',
        account_id: 'acc-1',
        name: 'Dana Darurat',
        goal_type: 'emergency_fund',
        target_amount: 30000000,
        target_date: '2027-06-30',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      account: { id: 'acc-1', name: 'BCA', type: 'BANK', currency: 'IDR', balance: 15370000 },
      saved: 15370000,
      isCompleted: false,
    },
  }),
  useUpdateGoal: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteGoal: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))
// Stub the edit sheet — its chrome is out of scope for this render test.
jest.mock('@/components/features/goals/EditGoalSheet', () => ({ EditGoalSheet: () => null }))

import { GoalDetailScreen } from '@/components/features/goals/GoalDetailScreen'

it('renders the goal detail header, saved amount, progress and an insight/feasibility key', () => {
  render(<GoalDetailScreen goalId="goal-1" />)
  // Header title
  expect(screen.getByText('detail.title')).toBeInTheDocument()
  // Goal name
  expect(screen.getByText('Dana Darurat')).toBeInTheDocument()
  // Formatted saved amount (Rp 15.370.000)
  expect(screen.getByText(/15\.370\.000|15,370,000/)).toBeInTheDocument()
  // % tercapai (51% of 30M)
  expect(screen.getByText(/card\.tercapai/)).toBeInTheDocument()
  // A feasibility key surfaces
  expect(screen.getByText(/detail\.feasible/)).toBeInTheDocument()
  // Insight cards surface
  expect(screen.getByText('insights.accelerateTitle')).toBeInTheDocument()
  expect(screen.getByText('insights.streakTitle')).toBeInTheDocument()
})
