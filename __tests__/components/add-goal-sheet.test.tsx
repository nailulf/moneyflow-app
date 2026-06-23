import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k, useLocale: () => 'en' }))
const createMut = jest.fn((_input: unknown) => Promise.resolve({ id: 'newgoal' }))
// GoalCreatedView (the in-sheet success step) calls useGoal(goalId) to render its recap.
jest.mock('@/hooks/useGoalsQuery', () => ({
  useCreateGoal: () => ({ mutateAsync: createMut, isPending: false }),
  useGoal: () => ({
    data: {
      goal: {
        id: 'newgoal', name: 'Dana Darurat', goal_type: 'emergency_fund',
        target_amount: 30000000, target_date: '12/2026', created_at: '2026-06-01',
      },
      account: { currency: 'IDR' },
      saved: 0,
      isCompleted: false,
    },
  }),
}))
jest.mock('@/contexts/AccountContext', () => ({
  useAccounts: () => ({ accounts: [{ id: 'a1', name: 'Bank BCA', type: 'BANK', currency: 'IDR' }] }),
}))

import { AddGoalSheet } from '@/components/features/goals/AddGoalSheet'

beforeEach(() => {
  createMut.mockClear()
})

it('submits a create payload with target date', async () => {
  const onCreated = jest.fn()
  render(<AddGoalSheet open onOpenChange={() => {}} accountId="a1" onCreated={onCreated} />)

  fireEvent.change(screen.getByLabelText('create.name'), { target: { value: 'Dana Darurat' } })
  fireEvent.change(screen.getByLabelText('create.amount'), { target: { value: '30000000' } })
  // type defaults to emergency_fund; month/year default to a valid near-future month.
  fireEvent.click(screen.getByRole('button', { name: 'create.submit' }))

  await waitFor(() => expect(createMut).toHaveBeenCalled())
  const payload = createMut.mock.calls[0][0] as {
    name: string
    goalType: string
    targetAmount: number
    targetDate: string
  }
  expect(payload.name).toBe('Dana Darurat')
  expect(payload.targetAmount).toBe(30000000)
  expect(payload.goalType).toBe('emergency_fund')
  expect(typeof payload.targetDate).toBe('string')
  expect(payload.targetDate).toMatch(/^\d{2}\/\d{4}$/)

  // Submit now shows the in-sheet success view; onCreated fires from "Lihat Target".
  await waitFor(() => expect(screen.getByRole('button', { name: 'success.viewGoal' })).toBeInTheDocument())
  expect(onCreated).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'success.viewGoal' }))
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith('newgoal'))
})

it('renders goal-type chips with the i18n label (not the hardcoded English label)', () => {
  render(<AddGoalSheet open onOpenChange={() => {}} accountId="a1" onCreated={() => {}} />)
  // The next-intl mock returns the key, so the localized chip renders as `types.<goal_type>`.
  expect(screen.getByRole('button', { name: /types\.emergency_fund/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /types\.gadget/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /types\.debt_payoff/ })).toBeInTheDocument()
})
