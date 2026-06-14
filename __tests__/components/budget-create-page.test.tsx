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
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'x@y.z', user_metadata: {} } }) }))
jest.mock('@/contexts/TransactionContext', () => ({
  useTransactions: () => ({ transactions: [], loading: false }),
}))
const createBudgetPlan = jest.fn()
jest.mock('@/lib/api/budget-plans', () => ({
  createBudgetPlan: (...a: unknown[]) => createBudgetPlan(...a),
  getAvailableCategories: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Food & Dining', color: '#a' }]),
}))
jest.mock('@/hooks/useBudgetSnapshot', () => ({
  useBudgetSnapshot: () => ({ snapshot: null, isLoading: false, noSnapshot: true, error: null, refetch: jest.fn() }),
}))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
// Templates helper: adapt the mock path/name to the real export found in lib/api/onboarding.ts
jest.mock('@/lib/api/onboarding', () => ({
  ...jest.requireActual('@/lib/api/onboarding'),
  getBudgetTemplates: jest.fn().mockResolvedValue([]),
}))

import BudgetCreatePage from '@/app/budget/create/page'

describe('BudgetCreatePage (monthly)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('disables preview CTA when category is added with amount 0', async () => {
    render(<BudgetCreatePage />)
    // advance past entry step
    fireEvent.click(screen.getByRole('button', { name: /next/ }))
    // open picker and add a category (amount stays 0)
    fireEvent.click(await screen.findByRole('button', { name: /amounts\.addCategory/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Food & Dining/ }))
    // amount is 0 → preview CTA must be disabled
    expect(screen.getByRole('button', { name: /amounts\.preview/ })).toBeDisabled()
  })

  it('walks entry → amounts → preview → submits the plan → created', async () => {
    createBudgetPlan.mockResolvedValue({ id: 'p1' })
    render(<BudgetCreatePage />)
    // step 1: entry (scratch preselected because no previous snapshot)
    expect(screen.getByText(/stepOf:\{"step":1/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next/ }))
    // step 2: amounts — add the available category via the picker
    fireEvent.click(await screen.findByRole('button', { name: /amounts\.addCategory/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Food & Dining/ }))
    fireEvent.change(screen.getByLabelText('Food & Dining'), { target: { value: '1500000' } })
    fireEvent.click(screen.getByRole('button', { name: /amounts\.preview/ }))
    // step 3: preview → save
    fireEvent.click(await screen.findByRole('button', { name: /preview\.save/ }))
    await waitFor(() => expect(createBudgetPlan).toHaveBeenCalled())
    expect(createBudgetPlan.mock.calls[0][0]).toMatchObject({
      userId: 'u1', period: 'monthly',
      categories: [{ category_id: 'c1', allocated_amount: 1500000 }],
    })
    // step 4: created
    expect(await screen.findByText('created.title')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'created.cta' }))
    expect(push).toHaveBeenCalledWith('/budget')
  })
})
