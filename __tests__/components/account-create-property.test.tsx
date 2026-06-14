import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// @radix-ui/react-switch uses ResizeObserver internally; jsdom doesn't provide it.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn(), replace: jest.fn() }),
}))
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
}))
const createAccount = jest.fn()
const deleteAccount = jest.fn()
jest.mock('@/contexts/AccountContext', () => ({
  useAccounts: () => ({ createAccount, deleteAccount, accounts: [], loading: false }),
}))
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'x@y.z', user_metadata: {} } }),
}))
const toastError = jest.fn()
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: (...a: unknown[]) => toastError(...a) } }))

import PropertyPage from '@/app/accounts/new/property/page'

const fillBase = () => {
  fireEvent.change(screen.getByPlaceholderText('property.namePlaceholder'), { target: { value: 'House — Depok' } })
  fireEvent.change(screen.getByLabelText('property.valueLabel'), { target: { value: '850000000' } })
  fireEvent.change(screen.getByLabelText('property.purchaseDateLabel'), { target: { value: '2024-05-01' } })
}

describe('PropertyPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a single PROPERTY account without mortgage', async () => {
    createAccount.mockResolvedValue({ id: 'p1', name: 'House — Depok', type: 'PROPERTY' })
    render(<PropertyPage />)
    fillBase()
    fireEvent.click(screen.getByRole('button', { name: 'property.submit' }))
    await waitFor(() => expect(createAccount).toHaveBeenCalledTimes(1))
    expect(createAccount.mock.calls[0][0]).toMatchObject({
      type: 'PROPERTY', balance: 850000000, purchase_date: '2024-05-01',
    })
    expect(await screen.findByText('success.title')).toBeInTheDocument()
  })

  it('creates property + linked mortgage when the toggle is on', async () => {
    createAccount
      .mockResolvedValueOnce({ id: 'p1', name: 'House — Depok', type: 'PROPERTY' })
      .mockResolvedValueOnce({ id: 'm1', name: 'House — Depok — Mortgage', type: 'MORTGAGE' })
    render(<PropertyPage />)
    fillBase()
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.change(screen.getByLabelText('property.downPayment'), { target: { value: '250000000' } })
    fireEvent.change(screen.getByLabelText('property.interestRate'), { target: { value: '7.5' } })
    fireEvent.change(screen.getByLabelText('property.monthlyPayment'), { target: { value: '5000000' } })
    fireEvent.change(screen.getByLabelText('property.loanTermYears'), { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: 'property.submit' }))
    await waitFor(() => expect(createAccount).toHaveBeenCalledTimes(2))
    expect(createAccount.mock.calls[0][0]).toMatchObject({ type: 'PROPERTY', down_payment: 250000000 })
    expect(createAccount.mock.calls[1][0]).toMatchObject({
      type: 'MORTGAGE', balance: -600000000, loan_term_months: 180, mortgage_end_date: '2039-05-01',
    })
    expect(await screen.findByText('success.title')).toBeInTheDocument()
  })

  it('rolls back the property when the mortgage create fails', async () => {
    createAccount
      .mockResolvedValueOnce({ id: 'p1', name: 'House — Depok', type: 'PROPERTY' })
      .mockRejectedValueOnce(new Error('boom'))
    deleteAccount.mockResolvedValue(undefined)
    render(<PropertyPage />)
    fillBase()
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.change(screen.getByLabelText('property.downPayment'), { target: { value: '250000000' } })
    fireEvent.change(screen.getByLabelText('property.interestRate'), { target: { value: '7.5' } })
    fireEvent.change(screen.getByLabelText('property.monthlyPayment'), { target: { value: '5000000' } })
    fireEvent.change(screen.getByLabelText('property.loanTermYears'), { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: 'property.submit' }))
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith('p1'))
    expect(toastError).toHaveBeenCalled()
    // form still visible, no success view
    expect(screen.queryByText('success.title')).not.toBeInTheDocument()
  })
})
