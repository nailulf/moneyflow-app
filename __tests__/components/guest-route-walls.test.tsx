import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const replace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
}))

// GuestRouteWall reads the current user from AuthContext to decide guest vs permanent.
let mockUser: { is_anonymous?: boolean } | null = null
let mockLoading = false
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, loading: mockLoading }),
}))

import { GuestRouteWall } from '@/components/features/onboarding/GuestRouteWall'
import NewTransactionLayout from '@/app/transactions/new/layout'
import EditTransactionLayout from '@/app/transactions/[id]/edit/layout'
import GoalsLayout from '@/app/goals/layout'
import BudgetCreateLayout from '@/app/budget/create/layout'
import BudgetEditLayout from '@/app/budget/edit/layout'
import NewAccountLayout from '@/app/accounts/new/layout'
import PortfolioAccountLayout from '@/app/portfolio/[accountId]/layout'
import ForecastLayout from '@/app/forecast/layout'

beforeEach(() => {
  replace.mockClear()
  mockUser = null
  mockLoading = false
})

describe('GuestRouteWall — route-level signup wall', () => {
  it('redirects a guest (anonymous) session to /start/save and hides the page', () => {
    mockUser = { is_anonymous: true }
    render(
      <GuestRouteWall>
        <div data-testid="walled-page" />
      </GuestRouteWall>
    )
    expect(replace).toHaveBeenCalledWith('/start/save')
    expect(screen.queryByTestId('walled-page')).not.toBeInTheDocument()
  })

  it('renders the page for a permanent user without redirecting', () => {
    mockUser = { is_anonymous: false }
    render(
      <GuestRouteWall>
        <div data-testid="walled-page" />
      </GuestRouteWall>
    )
    expect(replace).not.toHaveBeenCalled()
    expect(screen.getByTestId('walled-page')).toBeInTheDocument()
  })

  it('renders nothing and does not redirect while auth is still resolving', () => {
    mockUser = null
    mockLoading = true
    render(
      <GuestRouteWall>
        <div data-testid="walled-page" />
      </GuestRouteWall>
    )
    expect(replace).not.toHaveBeenCalled()
    expect(screen.queryByTestId('walled-page')).not.toBeInTheDocument()
  })

  it('renders the page for a signed-out (no session) user — pages handle that state themselves', () => {
    mockUser = null
    mockLoading = false
    render(
      <GuestRouteWall>
        <div data-testid="walled-page" />
      </GuestRouteWall>
    )
    expect(replace).not.toHaveBeenCalled()
    expect(screen.getByTestId('walled-page')).toBeInTheDocument()
  })
})

describe('guest signup walls — feature route layouts', () => {
  const layouts: Array<[string, (props: { children: React.ReactNode }) => React.ReactElement]> = [
    ['/transactions/new', NewTransactionLayout],
    ['/transactions/[id]/edit', EditTransactionLayout],
    ['/goals', GoalsLayout],
    ['/budget/create', BudgetCreateLayout],
    ['/budget/edit', BudgetEditLayout],
    ['/accounts/new', NewAccountLayout],
    ['/portfolio/[accountId]', PortfolioAccountLayout],
    ['/forecast', ForecastLayout],
  ]

  it.each(layouts)('%s redirects a guest to /start/save and hides the page', (_route, Layout) => {
    mockUser = { is_anonymous: true }
    render(
      <Layout>
        <div data-testid="walled-page" />
      </Layout>
    )
    expect(replace).toHaveBeenCalledWith('/start/save')
    expect(screen.queryByTestId('walled-page')).not.toBeInTheDocument()
  })

  it.each(layouts)('%s renders the page for a permanent user', (_route, Layout) => {
    mockUser = { is_anonymous: false }
    render(
      <Layout>
        <div data-testid="walled-page" />
      </Layout>
    )
    expect(replace).not.toHaveBeenCalled()
    expect(screen.getByTestId('walled-page')).toBeInTheDocument()
  })
})
