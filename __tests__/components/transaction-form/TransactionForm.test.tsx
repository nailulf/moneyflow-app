import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionForm } from '@/components/features/transaction/form/TransactionForm'

const create = jest.fn().mockResolvedValue({ id: 'new' })
jest.mock('@/hooks/useTransactionsQuery', () => ({
  useTransactionMutations: () => ({ create, update: jest.fn(), delete: jest.fn(), isCreating: false, isUpdating: false, isDeleting: false }),
}))
jest.mock('@/hooks/use-category-manager', () => ({ useCategories: () => ({ categories: [{ id: 'food', name: 'Food', group_type: 'EXPENSE' }] }) }))
jest.mock('@/contexts/AccountContext', () => ({ useAccounts: () => ({ accounts: [{ id: 'A', name: 'BCA', type: 'BANK', balance: 1, currency: 'IDR' }] }) }))

beforeEach(() => create.mockClear())

it('builds an expense and shows the success view on save', async () => {
  render(<TransactionForm mode="create" userId="u" onDone={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: '1' }))
  fireEvent.click(screen.getByRole('button', { name: '2' }))
  fireEvent.click(screen.getByRole('button', { name: '5' }))
  fireEvent.click(screen.getByText(/choose category/i)); fireEvent.click(await screen.findByText('Food'))
  fireEvent.click(screen.getByText(/choose account/i)); fireEvent.click(await screen.findByText('BCA'))
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  await waitFor(() => expect(create).toHaveBeenCalled())
  expect(create.mock.calls[0][0]).toMatchObject({ type: 'EXPENSE', amount: 125, category_id: 'food', account_id: 'A' })
  expect(await screen.findByText(/transaction added/i)).toBeInTheDocument()
})

it('changing type to Income clears the chosen category', async () => {
  render(<TransactionForm mode="create" userId="u" onDone={jest.fn()} />)
  fireEvent.click(screen.getByText(/choose category/i)); fireEvent.click(await screen.findByText('Food'))
  fireEvent.click(screen.getByRole('button', { name: /income/i }))
  expect(screen.getByText(/choose category/i)).toBeInTheDocument() // category reset to placeholder
})
