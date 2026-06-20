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

import { GoalsGrid } from '@/components/features/home/GoalsGrid'
import { UpcomingStrip } from '@/components/features/home/UpcomingStrip'
import { BiggestExpensesCard } from '@/components/features/home/BiggestExpensesCard'

describe('GoalsGrid', () => {
  const goal = {
    id: 'g1', name: 'Emergency Fund', goalType: 'emergency_fund',
    currentAmount: 37500000, targetAmount: 50000000, progressPercentage: 75, currency: 'IDR',
  }
  it('renders goal name, percentage pill and amounts', () => {
    render(<GoalsGrid goals={[goal]} />)
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText(/goals\.of:/)).toBeInTheDocument()
  })
  it('renders the empty state with a set-goal CTA when there are no goals', () => {
    render(<GoalsGrid goals={[]} />)
    expect(screen.getByText('goals.emptyTitle')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /goals\.setGoal/ })).toHaveAttribute('href', '/accounts')
  })
})

describe('UpcomingStrip', () => {
  const items = [
    { id: 't1', name: 'Netflix', categoryName: 'Entertainment', amount: 186000, currency: 'IDR', dayLabel: 'Sun', dayNumber: 15 },
    { id: 't2', name: 'PLN Token', categoryName: 'Bills & Utilities', amount: 200000, currency: 'IDR', dayLabel: 'Wed', dayNumber: 18 },
  ]
  it('renders a tile per item with day, name, amount', () => {
    render(<UpcomingStrip items={items} />)
    expect(screen.getByText('Netflix')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('PLN Token')).toBeInTheDocument()
  })
  it('renders the empty message when no items', () => {
    render(<UpcomingStrip items={[]} />)
    expect(screen.getByText('upcoming.emptyTitle')).toBeInTheDocument()
  })
})

describe('BiggestExpensesCard', () => {
  const rows = [
    { id: 'r1', name: 'Tokopedia', categoryName: 'Shopping', amount: 2450000, currency: 'IDR' },
    { id: 'r2', name: 'PLN Electricity', categoryName: 'Bills & Utilities', amount: 1200000, currency: 'IDR' },
  ]
  it('renders ranked rows with names, category pills, and negative amounts', () => {
    render(<BiggestExpensesCard rows={rows} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Tokopedia')).toBeInTheDocument()
    expect(screen.getByText('Shopping')).toBeInTheDocument()
    expect(screen.getAllByText(/− /)).toHaveLength(2)
    expect(screen.getByRole('link', { name: /biggest\.seeAll/ })).toHaveAttribute('href', '/transactions')
  })
  it('renders the empty message when no rows', () => {
    render(<BiggestExpensesCard rows={[]} />)
    expect(screen.getByText('biggest.emptyTitle')).toBeInTheDocument()
  })
})
