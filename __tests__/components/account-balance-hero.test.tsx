import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }))
import { Building2 } from 'lucide-react'
import { AccountBalanceHero } from '@/components/features/accounts/detail/AccountBalanceHero'

it('renders the label and formatted balance', () => {
  render(<AccountBalanceHero icon={Building2} balance={45200000} currency="IDR" />)
  expect(screen.getByText('hero.currentBalance')).toBeInTheDocument()
  expect(screen.getByText(/45.200.000|45,200,000/)).toBeInTheDocument()
})
