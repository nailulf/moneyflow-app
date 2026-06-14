import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next/navigation', () => ({ usePathname: jest.fn(() => '/') }))
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
jest.mock('@/components/features/transaction/AddTransactionForm', () => ({
  AddTransactionForm: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}))

import { usePathname } from 'next/navigation'
import { MobileBottomNav } from '@/components/features/navigation/MobileBottomNav'

describe('MobileBottomNav', () => {
  it('renders 4 tabs with correct hrefs and the Add FAB', () => {
    render(<MobileBottomNav />)
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /wallets/i })).toHaveAttribute('href', '/accounts')
    expect(screen.getByRole('link', { name: /budget/i })).toHaveAttribute('href', '/budget')
    expect(screen.getByRole('link', { name: /portfolio/i })).toHaveAttribute('href', '/portfolio')
    expect(screen.getByRole('button', { name: /addTransaction/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(4)
  })

  it('marks the active tab via aria-current from the path', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/budget')
    render(<MobileBottomNav />)
    expect(screen.getByRole('link', { name: /budget/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /home/i })).not.toHaveAttribute('aria-current')
  })

  it('styles the active tab with the selected tint pill', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/accounts')
    render(<MobileBottomNav />)
    const active = screen.getByRole('link', { name: /wallets/i })
    expect(active.className).toContain('bg-selected')
    expect(active.className).toContain('text-selected-foreground')
    const inactive = screen.getByRole('link', { name: /home/i })
    expect(inactive.className).not.toContain('bg-selected')
  })

  it('keeps every tab label visible regardless of active state', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/')
    render(<MobileBottomNav />)
    for (const label of ['home', 'wallets', 'budget', 'portfolio']) {
      expect(screen.getByText(label)).toBeVisible()
    }
  })
})
