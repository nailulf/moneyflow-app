import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next-intl', () => require('@/__tests__/components/transaction-form/i18n-mock').nextIntlMock)

import { TransactionSuccessView } from '@/components/features/transaction/form/TransactionSuccessView'

const tx = { type: 'EXPENSE' as const, amount: 125000, categoryName: 'Coffee', accountName: 'BCA', date: '2026-06-14', currency: 'IDR', toAccountName: null }

it('create mode shows Done + Add another', () => {
  const onDone = jest.fn(); const onAddAnother = jest.fn()
  render(<TransactionSuccessView mode="create" summary={tx} onDone={onDone} onAddAnother={onAddAnother} />)
  expect(screen.getByText(/transaction added/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /add another/i })); expect(onAddAnother).toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /done/i })); expect(onDone).toHaveBeenCalled()
})

it('edit mode shows Done only', () => {
  render(<TransactionSuccessView mode="edit" summary={tx} onDone={jest.fn()} onAddAnother={jest.fn()} />)
  expect(screen.getByText(/transaction updated/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /add another/i })).toBeNull()
})
