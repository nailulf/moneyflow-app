import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }))
import { AccountActionsMenu } from '@/components/features/accounts/detail/AccountActionsMenu'

// Radix DropdownMenu does not open via fireEvent.click in jsdom (it relies on
// pointer-capture events that jsdom does not implement). The repo's other
// dropdown test (NavMoreItems.test.tsx) works around this the same way: assert
// the trigger is an accessible button, then drive the item handlers directly.
it('exposes an accessible trigger button', () => {
  const noop = jest.fn()
  render(<AccountActionsMenu onEdit={noop} onExport={noop} onDelete={noop} />)
  expect(screen.getByRole('button', { name: /menu|more|actions/i })).toBeInTheDocument()
})

it('fires the menu handlers', () => {
  const onEdit = jest.fn(); const onExport = jest.fn(); const onDelete = jest.fn()
  render(<AccountActionsMenu onEdit={onEdit} onExport={onExport} onDelete={onDelete} />)
  // Open the Radix menu programmatically (keyboard activation opens it in jsdom).
  fireEvent.keyDown(screen.getByRole('button', { name: /menu|more|actions/i }), { key: 'Enter' })
  fireEvent.click(screen.getByText('menu.edit'))
  expect(onEdit).toHaveBeenCalled()
})
