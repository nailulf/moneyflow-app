import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next-intl', () => require('@/__tests__/components/transaction-form/i18n-mock').nextIntlMock)

import { RecurringFields } from '@/components/features/transaction/form/RecurringFields'

it('selects a frequency and toggles end-date mode', () => {
  const onChange = jest.fn()
  render(<RecurringFields frequency="monthly" endDate={null} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: /weekly/i }))
  expect(onChange).toHaveBeenCalledWith({ frequency: 'weekly', endDate: null })
  fireEvent.click(screen.getByRole('button', { name: /on date/i }))
  expect(onChange).toHaveBeenCalled() // switches to date mode
})
