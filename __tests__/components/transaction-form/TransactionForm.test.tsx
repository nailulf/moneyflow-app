import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('next-intl', () => require('@/__tests__/components/transaction-form/i18n-mock').nextIntlMock)

import { TransactionForm } from '@/components/features/transaction/form/TransactionForm'

const create = jest.fn().mockResolvedValue({ id: 'new' })
const update = jest.fn().mockResolvedValue({ id: 'e1' })
const del = jest.fn().mockResolvedValue('e1')

jest.mock('@/hooks/useTransactionsQuery', () => ({
  useTransactionMutations: () => ({
    create,
    update,
    delete: del,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  }),
}))
jest.mock('@/hooks/useTransactionCategories', () => ({
  useTransactionCategories: () => ({
    categories: [{ id: 'food', name: 'Food', group_type: 'EXPENSE' }],
    isLoading: false,
    error: null,
    addCategory: jest.fn().mockResolvedValue('new-cat'),
    isAdding: false,
  }),
}))
jest.mock('@/contexts/AccountContext', () => ({ useAccounts: () => ({ accounts: [{ id: 'A', name: 'BCA', type: 'BANK', balance: 1, currency: 'IDR' }] }) }))

beforeEach(() => {
  create.mockClear()
  update.mockClear()
  del.mockClear()
})

it('builds an expense and shows the success view on save', async () => {
  render(<TransactionForm mode="create" userId="u" onDone={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: '1' }))
  fireEvent.click(screen.getByRole('button', { name: '2' }))
  fireEvent.click(screen.getByRole('button', { name: '5' }))
  fireEvent.click(screen.getByText('Food')) // inline category chip
  fireEvent.click(screen.getByText(/select account/i)); fireEvent.click(await screen.findByText('BCA'))
  fireEvent.click(screen.getByRole('button', { name: /save transaction/i }))
  await waitFor(() => expect(create).toHaveBeenCalled())
  expect(create.mock.calls[0][0]).toMatchObject({ type: 'EXPENSE', amount: 125, category_id: 'food', account_id: 'A' })
  expect(await screen.findByText(/transaction added/i)).toBeInTheDocument()
})

it('changing type to Income clears the chosen category', async () => {
  render(<TransactionForm mode="create" userId="u" onDone={jest.fn()} />)
  fireEvent.click(screen.getByText('Food')) // select expense chip
  fireEvent.click(screen.getByRole('button', { name: /income/i }))
  // Food is an EXPENSE-only category, so it drops out of the chip row for INCOME
  expect(screen.queryByText('Food')).toBeNull()
})

// ---------------------------------------------------------------------------
// Edit-mode tests (E1)
// ---------------------------------------------------------------------------

const editInitial = {
  id: 'e1', type: 'EXPENSE' as const, amount: { digits: '300' }, categoryId: 'food',
  accountId: 'A', toAccountId: null, note: 'x', date: '2026-06-14', currency: 'IDR',
  isRecurring: false, recurringFrequency: null, recurringEndDate: null,
}

it('edit seeds fields and updates via {id,data}', async () => {
  render(<TransactionForm mode="edit" userId="u" initial={editInitial} onDone={jest.fn()} />)
  expect(screen.getByText('300')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /save transaction/i }))
  await waitFor(() => expect(update).toHaveBeenCalled())
  expect(update.mock.calls[0][0]).toMatchObject({ id: 'e1', data: expect.objectContaining({ amount: 300 }) })
  expect(await screen.findByText(/transaction updated/i)).toBeInTheDocument()
})

it('delete calls the delete mutation after confirm', async () => {
  render(<TransactionForm mode="edit" userId="u" initial={editInitial} onDone={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /delete/i }))
  fireEvent.click(await screen.findByRole('button', { name: /^(confirm|delete)/i }))
  await waitFor(() => expect(del).toHaveBeenCalledWith('e1'))
})

it('shows a Balance adjustment badge for adjustment rows', () => {
  render(<TransactionForm mode="edit" userId="u" initial={{ ...editInitial, isBalanceAdjustment: true }} onDone={jest.fn()} />)
  expect(screen.getByText(/balance adjustment/i)).toBeInTheDocument()
})

it('create mode shows no delete button', () => {
  render(<TransactionForm mode="create" userId="u" onDone={jest.fn()} />)
  expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
})
