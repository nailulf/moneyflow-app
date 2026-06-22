import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k, useLocale: () => 'en' }))
const createMut = jest.fn((_input: unknown) => Promise.resolve({ id: 'newgoal' }))
jest.mock('@/hooks/useGoalsQuery', () => ({ useCreateGoal: () => ({ mutateAsync: createMut, isPending: false }) }))
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

  await waitFor(() => expect(onCreated).toHaveBeenCalledWith('newgoal'))
})
