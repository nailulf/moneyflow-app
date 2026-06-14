import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
const back = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back, replace: jest.fn() }),
  usePathname: jest.fn(() => '/accounts/new'),
}))
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

import AccountTypeSelectPage from '@/app/accounts/new/page'
import { AccountCreatedView } from '@/components/features/accounts/create/AccountCreatedView'

describe('AccountTypeSelectPage', () => {
  beforeEach(() => jest.clearAllMocks())
  it('renders six type rows linking to the per-type forms', () => {
    render(<AccountTypeSelectPage />)
    expect(screen.getByRole('link', { name: /types\.bank/ })).toHaveAttribute('href', '/accounts/new/bank')
    expect(screen.getByRole('link', { name: /types\.digitalWallet/ })).toHaveAttribute('href', '/accounts/new/bank?kind=wallet')
    expect(screen.getByRole('link', { name: /types\.property/ })).toHaveAttribute('href', '/accounts/new/property')
    expect(screen.getByRole('link', { name: /types\.vehicle/ })).toHaveAttribute('href', '/accounts/new/vehicle')
    expect(screen.getByRole('link', { name: /types\.creditCard/ })).toHaveAttribute('href', '/accounts/new/credit-card')
    expect(screen.getByRole('link', { name: /types\.investment/ })).toHaveAttribute('href', '/accounts/new/investment')
  })
})

describe('AccountCreatedView', () => {
  beforeEach(() => jest.clearAllMocks())
  it('shows account chip and routes the default CTA back to wallets', () => {
    render(<AccountCreatedView account={{ name: 'GoPay', type: 'DIGITAL_WALLET' }} />)
    expect(screen.getByText('success.title')).toBeInTheDocument()
    expect(screen.getByText('GoPay')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'success.backToWallets' }))
    expect(push).toHaveBeenCalledWith('/accounts')
  })
  it('shows investment CTAs routing to the portfolio', () => {
    render(<AccountCreatedView account={{ name: 'Stockbit', type: 'INVESTMENT' }} />)
    expect(screen.getByText('success.investmentInfo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'success.addAsset' }))
    expect(push).toHaveBeenCalledWith('/portfolio')
  })
})
