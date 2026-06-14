import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

global.ResizeObserver = global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams('period=yearly'),
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

const yearlyPlan = {
  id: 'yp1', user_id: 'u1', period: 'yearly', total_amount: 8_600_000, currency: 'IDR',
  budget_plan_categories: [
    { id: 'r1', category_id: 'c1', allocated_amount: 5_000_000, categories: { id: 'c1', name: 'Holiday Travel', color: '#aabbcc' } },
    { id: 'r2', category_id: 'c2', allocated_amount: 3_600_000, categories: { id: 'c2', name: 'Insurance', color: '#ddeeff' } },
  ],
}
jest.mock('@/lib/api/budget-plans', () => ({
  updateBudgetPlan: jest.fn(),
  // yearly → the plan being edited; monthly → none (keeps the locked notice empty, avoids name collisions)
  getBudgetPlan: jest.fn().mockImplementation(async (_uid: string, period: string) => (period === 'yearly' ? yearlyPlan : null)),
  getAvailableCategories: jest.fn().mockResolvedValue([]),
}))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import BudgetEditPage from '@/app/budget/edit/page'

describe('BudgetEditPage (yearly)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('advances from the amounts step to the preview hero before applying', async () => {
    render(<BudgetEditPage />)
    // selector renders the existing plan categories
    await screen.findByText('Holiday Travel')
    expect(screen.getByText('Insurance')).toBeInTheDocument()

    // yearly shows a Preview button (not a direct Apply), enabled with a valid plan
    const previewBtn = screen.getByRole('button', { name: /amounts\.preview/ })
    expect(previewBtn).toBeEnabled()
    fireEvent.click(previewBtn)

    // the navy preview hero + budget-type split now render
    expect(await screen.findByText('yearlyPreview.splitTitle')).toBeInTheDocument()
    expect(screen.getByText('yearlyPreview.categoriesTitle')).toBeInTheDocument()

    // no edits yet → Apply is disabled on the preview step
    expect(screen.getByRole('button', { name: /applyChanges/ })).toBeDisabled()
  })
})
