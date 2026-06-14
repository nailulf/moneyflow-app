import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/molecules/dropdown-menu'
import { NavMoreItems } from '@/components/features/navigation/nav-more-items'

function renderInMenu() {
  return render(
    <DropdownMenu open>
      <DropdownMenuTrigger>open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <NavMoreItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('NavMoreItems', () => {
  it('renders the temporary Transactions entry + links to the existing secondary routes', () => {
    renderInMenu()
    expect(screen.getByRole('menuitem', { name: /transactions/i })).toHaveAttribute('href', '/transactions')
    expect(screen.getByRole('menuitem', { name: /forecast/i })).toHaveAttribute('href', '/forecast')
    expect(screen.getByRole('menuitem', { name: /spending/i })).toHaveAttribute('href', '/spending')
    expect(screen.getByRole('menuitem', { name: /advice/i })).toHaveAttribute('href', '/advice')
    expect(screen.getByRole('menuitem', { name: /invest/i })).toHaveAttribute('href', '/invest')
    expect(screen.getByRole('menuitem', { name: /equity/i })).toHaveAttribute('href', '/equity')
    expect(screen.getByRole('menuitem', { name: /charts/i })).toHaveAttribute('href', '/charts')
  })
})
