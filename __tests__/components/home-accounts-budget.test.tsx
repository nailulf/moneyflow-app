import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

import { AccountsCards } from '@/components/features/home/AccountsCards'
import { BudgetCard } from '@/components/features/home/BudgetCard'

describe('AccountsCards', () => {
  const acc = (id: string, name: string) => ({ id, name, color: undefined })
  it('renders totals, counts, up to three names per card and the more-footer', () => {
    render(
      <AccountsCards
        currency="IDR"
        assetsTotal={189800000}
        liabilitiesTotal={44600000}
        assets={[acc('1', 'BCA Savings'), acc('2', 'Mandiri'), acc('3', 'GoPay'), acc('4', 'Cash'), acc('5', 'Bibit')]}
        liabilities={[acc('6', 'KPR BCA'), acc('7', 'Car Loan')]}
      />
    )
    expect(screen.getByText(/accounts\.accountsCount:\{"count":5\}/)).toBeInTheDocument()
    expect(screen.getByText(/accounts\.loansCount:\{"count":2\}/)).toBeInTheDocument()
    expect(screen.getByText('BCA Savings')).toBeInTheDocument()
    expect(screen.queryByText('Cash')).not.toBeInTheDocument() // only first 3 listed
    expect(screen.getByText(/accounts\.more:\{"count":2\}/)).toBeInTheDocument()
    expect(screen.getByText('KPR BCA')).toBeInTheDocument()
    // section link goes to /accounts
    expect(screen.getByRole('link', { name: /accounts\.seeAll/ })).toHaveAttribute('href', '/accounts')
  })
})

describe('BudgetCard', () => {
  it('renders spent/total, percentage and remaining when within budget', () => {
    render(<BudgetCard monthLabel="June 2026" spent={5200000} total={8500000} currency="IDR" />)
    expect(screen.getByText(/5\.200\.000/)).toBeInTheDocument()
    expect(screen.getByText(/budget\.used:\{"pct":61\}/)).toBeInTheDocument()
    expect(screen.getByText('budget.onTrack')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /budget\.viewAll/ })).toHaveAttribute('href', '/budget')
  })
  it('shows over-budget state past 100%', () => {
    render(<BudgetCard monthLabel="June 2026" spent={9000000} total={8500000} currency="IDR" />)
    expect(screen.getByText('budget.overBudget')).toBeInTheDocument()
  })
  it('renders the empty state without totals when total is 0', () => {
    render(<BudgetCard monthLabel="June 2026" spent={0} total={0} currency="IDR" />)
    expect(screen.getByText('budget.noBudget')).toBeInTheDocument()
  })
})
