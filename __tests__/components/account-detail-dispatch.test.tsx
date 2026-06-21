import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const replace = jest.fn()
jest.mock('next/navigation', () => ({ useParams: () => ({ accountId: 'acc-1' }), useRouter: () => ({ replace, push: jest.fn() }) }))
jest.mock('@/components/features/accounts/detail/AccountDetailScreen', () => ({ AccountDetailScreen: () => <div>NEW_SCREEN</div> }))
jest.mock('@/components/AccountDetailView', () => ({ AccountDetailView: () => <div>LEGACY_VIEW</div> }))

let mockType = 'BANK'
jest.mock('@/contexts/AccountContext', () => ({
  useAccounts: () => ({ accounts: [{ id: 'acc-1', type: mockType }], loading: false }),
}))

import AccountDetailPage from '@/app/accounts/[accountId]/page'

it('renders the new screen for a BANK account', () => {
  mockType = 'BANK'
  render(<AccountDetailPage />)
  expect(screen.getByText('NEW_SCREEN')).toBeInTheDocument()
})

it('renders the legacy view for a PROPERTY account', () => {
  mockType = 'PROPERTY'
  render(<AccountDetailPage />)
  expect(screen.getByText('LEGACY_VIEW')).toBeInTheDocument()
})

it('redirects an INVESTMENT account to portfolio', () => {
  mockType = 'INVESTMENT'
  replace.mockClear()
  render(<AccountDetailPage />)
  expect(replace).toHaveBeenCalledWith('/portfolio/acc-1')
})
