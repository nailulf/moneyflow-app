import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
}))
const createAccount = jest.fn()
jest.mock('@/contexts/AccountContext', () => ({
  useAccounts: () => ({ createAccount, deleteAccount: jest.fn(), accounts: [], loading: false }),
}))
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'x@y.z', user_metadata: {} } }),
}))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import BankAccountPage from '@/app/accounts/new/bank/page'

describe('BankAccountPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('submits a BANK payload with the entered name and balance', async () => {
    createAccount.mockResolvedValue({ id: 'a1', name: 'BCA Savings', type: 'BANK' })
    render(<BankAccountPage />)
    fireEvent.change(screen.getByPlaceholderText('bank.namePlaceholder'), { target: { value: 'BCA Savings' } })
    fireEvent.change(screen.getByLabelText('bank.balanceLabel'), { target: { value: '1000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'bank.submit' }))
    await waitFor(() => expect(createAccount).toHaveBeenCalled())
    expect(createAccount.mock.calls[0][0]).toMatchObject({
      user_id: 'user-1', name: 'BCA Savings', type: 'BANK', balance: 1000000, currency: 'IDR',
    })
    // success view replaces the form
    expect(await screen.findByText('success.title')).toBeInTheDocument()
  })

  it('switches the segment to DIGITAL_WALLET and submits that type', async () => {
    createAccount.mockResolvedValue({ id: 'a2', name: 'GoPay', type: 'DIGITAL_WALLET' })
    render(<BankAccountPage />)
    fireEvent.click(screen.getByRole('button', { name: 'bank.segWallet' }))
    fireEvent.change(screen.getByPlaceholderText('bank.walletPlaceholder'), { target: { value: 'GoPay' } })
    fireEvent.click(screen.getByRole('button', { name: 'bank.submit' }))
    await waitFor(() => expect(createAccount).toHaveBeenCalled())
    expect(createAccount.mock.calls[0][0]).toMatchObject({ type: 'DIGITAL_WALLET', name: 'GoPay' })
  })

  it('shows the name error and does not submit when empty', async () => {
    render(<BankAccountPage />)
    fireEvent.click(screen.getByRole('button', { name: 'bank.submit' }))
    expect(await screen.findByText('errors.nameRequired')).toBeInTheDocument()
    expect(createAccount).not.toHaveBeenCalled()
  })
})
