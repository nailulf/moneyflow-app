import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'x@y.z', user_metadata: {} } }) }))
jest.mock('@/contexts/TransactionContext', () => ({
  useTransactions: () => ({ transactions: [], loading: false }),
}))
const createBudgetPlan = jest.fn()
jest.mock('@/lib/api/budget-plans', () => ({
  createBudgetPlan: (...a: unknown[]) => createBudgetPlan(...a),
  getAvailableCategories: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Holiday Travel', color: '#a' }]),
  getBudgetPlan: jest.fn().mockResolvedValue({
    id: 'm1',
    total_amount: 8_500_000,
    currency: 'IDR',
    budget_plan_categories: [
      { category_id: 'c9', allocated_amount: 8_500_000, categories: { id: 'c9', name: 'Groceries', color: '#b' } },
    ],
  }),
}))
jest.mock('@/hooks/useBudgetSnapshot', () => ({
  useBudgetSnapshot: () => ({ snapshot: null, isLoading: false, noSnapshot: true, error: null, refetch: jest.fn() }),
}))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock('@/lib/api/onboarding', () => ({
  ...jest.requireActual('@/lib/api/onboarding'),
  getBudgetTemplates: jest.fn().mockResolvedValue([]),
}))

import BudgetCreatePage from '@/app/budget/create/page'

describe('BudgetCreatePage (yearly)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows the locked monthly card and the checkbox selector on the amounts step', async () => {
    render(<BudgetCreatePage />)
    // locked monthly category surfaces from the monthly plan
    expect(await screen.findByText('Groceries')).toBeInTheDocument()
    // available-for-yearly checkbox selector
    expect(screen.getByText('yearlyAmounts.available')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Holiday Travel' })).toBeInTheDocument()
  })

  it('selects a category, sets an amount, and reaches the yearly preview hero', async () => {
    render(<BudgetCreatePage />)
    // toggle the category on (enters inline amount edit)
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Holiday Travel' }))
    // set the amount via the revealed input
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Holiday Travel' }), { target: { value: '5000000' } })
    // CTA enabled → go to preview
    const cta = screen.getByRole('button', { name: /amounts\.preview/ })
    expect(cta).not.toBeDisabled()
    fireEvent.click(cta)
    // preview hero + save CTA render
    expect(await screen.findByText(/yearlyPreview\.heroLabel/)).toBeInTheDocument()
    expect(screen.getByText('yearlyPreview.splitTitle')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /yearlyPreview\.save/ })).toBeInTheDocument()
  })
})
