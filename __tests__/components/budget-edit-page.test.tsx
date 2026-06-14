import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

global.ResizeObserver = global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams('period=monthly'),
}))
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
  useLocale: () => 'en',
}))
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'x', user_metadata: {} } }) }))
jest.mock('@/contexts/TransactionContext', () => ({ useTransactions: () => ({ transactions: [], loading: false }) }))
const updateBudgetPlan = jest.fn()
const plan = {
  id: 'p1', user_id: 'u1', period: 'monthly', total_amount: 2_000_000, currency: 'IDR',
  budget_plan_categories: [
    { id: 'r1', category_id: 'c1', allocated_amount: 1_500_000, categories: { id: 'c1', name: 'Food & Dining', color: '#a' } },
    { id: 'r2', category_id: 'c2', allocated_amount: 500_000, categories: { id: 'c2', name: 'Transport', color: '#b' } },
  ],
}
jest.mock('@/lib/api/budget-plans', () => ({
  updateBudgetPlan: (...a: unknown[]) => updateBudgetPlan(...a),
  getBudgetPlan: jest.fn().mockImplementation(async () => plan),
  getAvailableCategories: jest.fn().mockResolvedValue([]),
}))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import BudgetEditPage from '@/app/budget/edit/page'

describe('BudgetEditPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('prefills, edits an amount, confirms deltas, applies the update', async () => {
    updateBudgetPlan.mockResolvedValue(plan)
    render(<BudgetEditPage />)
    const input = await screen.findByLabelText('Food & Dining')
    fireEvent.change(input, { target: { value: '1800000' } })
    fireEvent.click(screen.getByRole('button', { name: /applyChanges/ }))
    // confirm sheet shows the delta
    expect(await screen.findByText('confirm.title')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'confirm.apply' }))
    await waitFor(() => expect(updateBudgetPlan).toHaveBeenCalled())
    expect(updateBudgetPlan.mock.calls[0][0]).toMatchObject({
      id: 'p1',
      categories: expect.arrayContaining([
        { category_id: 'c1', allocated_amount: 1_800_000 },
        { category_id: 'c2', allocated_amount: 500_000 },
      ]),
    })
    expect(push).toHaveBeenCalledWith('/budget')
  })

  it('disables Apply when nothing changed', async () => {
    render(<BudgetEditPage />)
    await screen.findByLabelText('Food & Dining')
    expect(screen.getByRole('button', { name: /applyChanges/ })).toBeDisabled()
  })
})
