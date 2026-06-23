import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k, useLocale: () => 'en' }))
jest.mock('@/hooks/useGoalsQuery', () => ({ useGoal: () => ({ data: { goal: { id: 'g1', name: 'Dana Darurat', goal_type: 'emergency_fund', target_amount: 30000000, target_date: '2026-12-31', status: 'active', created_at: '2026-01-01T00:00:00Z' }, account: { currency: 'IDR' }, saved: 0, isCompleted: false } }) }))

import { GoalCreatedView } from '@/components/features/goals/GoalCreatedView'

it('shows success + recap and fires both CTAs', () => {
  const onView = jest.fn()
  const onBack = jest.fn()
  render(<GoalCreatedView goalId="g1" onViewGoal={onView} onBackToAccount={onBack} />)
  expect(screen.getByText('success.title')).toBeInTheDocument()
  expect(screen.getByText('Dana Darurat')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'success.viewGoal' }))
  expect(onView).toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'success.backToAccount' }))
  expect(onBack).toHaveBeenCalled()
})
