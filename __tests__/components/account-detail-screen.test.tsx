import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: any) => (v?.value ?? k), useLocale: () => 'en' }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }))
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
jest.mock('@/contexts/CategoryContext', () => ({ useCategories: () => ({ getCategoryName: () => 'Food', categories: [] }) }))
jest.mock('@/hooks/useTransactionsQuery', () => ({ useAllTransactions: () => ({ transactions: [], isLoading: false }) }))
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }), useQueryClient: () => ({ invalidateQueries: jest.fn() }) }))
jest.mock('@/contexts/AccountContext', () => ({
  useAccounts: () => ({
    accounts: [{ id: 'acc-1', name: 'BCA Savings', type: 'BANK', currency: 'IDR', balance: 28000000, currentBalance: 45200000, created_at: '2026-01-01T00:00:00Z', is_active: true }],
    loading: false,
    updateAccount: jest.fn(),
    deleteAccount: jest.fn(),
  }),
}))
// Recharts can break under jsdom; stub the trend card — assertions target header + hero.
jest.mock('@/components/features/accounts/detail/BalanceTrendCard', () => ({ BalanceTrendCard: () => null }))
// Goals section pulls react-query mutations + AddGoalSheet; stub it — out of scope here.
jest.mock('@/components/features/goals/AccountGoalsSection', () => ({ AccountGoalsSection: () => null }))

import { AccountDetailScreen } from '@/components/features/accounts/detail/AccountDetailScreen'

it('renders the account name, hero balance and trend', () => {
  render(<AccountDetailScreen accountId="acc-1" />)
  expect(screen.getByText('BCA Savings')).toBeInTheDocument()
  expect(screen.getByText('hero.currentBalance')).toBeInTheDocument()
  expect(screen.getByText(/45.200.000|45,200,000/)).toBeInTheDocument()
})
