import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
}))

import { NetWorthStrip } from '@/components/features/wallets/NetWorthStrip'
import { AccountGroupCard } from '@/components/features/wallets/AccountGroupCard'

describe('NetWorthStrip', () => {
  it('renders the net worth amount and assets/liabilities values', () => {
    render(<NetWorthStrip netWorth={145200000} assetsTotal={189800000} liabilitiesTotal={44600000} currency="IDR" />)
    expect(screen.getByText(/145\.200\.000/)).toBeInTheDocument()
    expect(screen.getByText('netWorth.assets')).toBeInTheDocument()
    expect(screen.getByText('netWorth.liabilities')).toBeInTheDocument()
  })
})

describe('AccountGroupCard', () => {
  const accounts = [
    { id: 'a1', name: 'BCA Savings', type: 'BANK', balance: 45200000, currency: 'IDR' },
    { id: 'a2', name: 'Overdraft', type: 'CASH', balance: -50000, currency: 'IDR' },
  ]
  it('renders group title, count, and tappable rows with balances', () => {
    const onOpen = jest.fn()
    render(<AccountGroupCard groupKey="bank" accounts={accounts as never} onOpen={onOpen} />)
    expect(screen.getByText('groups.bank')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('BCA Savings')).toBeInTheDocument()
    expect(screen.getByText(/45\.200\.000/)).toBeInTheDocument()
    // negative balance renders with a minus prefix
    expect(screen.getByText(/− /)).toBeInTheDocument()
    screen.getByRole('button', { name: /BCA Savings/ }).click()
    expect(onOpen).toHaveBeenCalledWith('a1')
  })

  it('shows the native-currency balance on rows even when a base-converted value exists', () => {
    // FX-aware accounts (from /api/net-worth) carry currentBalanceInBase (IDR).
    // The row must keep showing the native AED figure, not the IDR conversion.
    const fx = [{
      id: 'a3', name: 'Wio', type: 'BANK', currency: 'AED',
      balance: 75101, currentBalance: 75101, currentBalanceInBase: 335200000,
    }]
    render(<AccountGroupCard groupKey="bank" accounts={fx as never} onOpen={() => {}} />)
    expect(screen.getByText(/75\.101|75,101/)).toBeInTheDocument()
    expect(screen.queryByText(/335\.200\.000|335,200,000/)).not.toBeInTheDocument()
  })
})
