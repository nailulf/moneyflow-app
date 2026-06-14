import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next-intl', () => require('@/__tests__/components/transaction-form/i18n-mock').nextIntlMock)

import { AccountPickerSheet } from '@/components/features/transaction/form/AccountPickerSheet'

const accts = [
  { id: 'A', name: 'BCA', type: 'BANK', balance: 1000000, currency: 'IDR' },
  { id: 'B', name: 'Cash', type: 'CASH', balance: 50000, currency: 'IDR' },
]

it('lists accounts, excludes the disabled id, emits selection', () => {
  const onSelect = jest.fn()
  render(<AccountPickerSheet open title="From" accounts={accts as any} selectedId={null} excludeId="B" onSelect={onSelect} onOpenChange={jest.fn()} />)
  expect(screen.getByText('BCA')).toBeInTheDocument()
  expect(screen.queryByText('Cash')).toBeNull() // excluded (e.g. already the To account)
  fireEvent.click(screen.getByText('BCA'))
  expect(onSelect).toHaveBeenCalledWith('A')
})

it('search filters the list', () => {
  render(<AccountPickerSheet open title="Account" accounts={accts as any} selectedId={null} onSelect={jest.fn()} onOpenChange={jest.fn()} />)
  fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'cash' } })
  expect(screen.queryByText('BCA')).toBeNull()
  expect(screen.getByText('Cash')).toBeInTheDocument()
})
