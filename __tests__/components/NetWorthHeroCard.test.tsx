import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
}))

import { NetWorthHeroCard } from '@/components/features/home/NetWorthHeroCard'

const props = {
  netWorth: 145200000,
  changePercentage: 2.3,
  currency: 'IDR',
  months: [
    { label: 'May', spending: 200, netWorth: 20 },
    { label: 'Jun', spending: 150, netWorth: 30 },
  ],
  income: 12500000,
  expenses: 5200000,
}

describe('NetWorthHeroCard', () => {
  it('renders amount, trend badge, month labels, and footer values', () => {
    render(<NetWorthHeroCard {...props} />)
    expect(screen.getByText(/145\.200\.000/)).toBeInTheDocument()
    expect(screen.getByText(/hero\.thisMonth:\{"pct":"\+2.3"\}/)).toBeInTheDocument()
    expect(screen.getByText('May')).toBeInTheDocument()
    expect(screen.getByText('Jun')).toBeInTheDocument()
    expect(screen.getByText(/12\.500\.000/)).toBeInTheDocument()
    // anchored with the minus sign — a bare /5\.200\.000/ would also match inside "145.200.000"
    expect(screen.getByText(/− Rp\s?5\.200\.000/)).toBeInTheDocument()
    // saved = income - expenses
    expect(screen.getByText(/7\.300\.000/)).toBeInTheDocument()
  })

  it('renders one chart bar per month', () => {
    const { container } = render(<NetWorthHeroCard {...props} />)
    expect(container.querySelectorAll('rect[data-bar]')).toHaveLength(2)
    expect(container.querySelector('polyline')).toBeInTheDocument()
  })

  it('handles empty months without crashing', () => {
    render(<NetWorthHeroCard {...props} months={[]} />)
    expect(screen.getByText('hero.totalNetWorth')).toBeInTheDocument()
  })
})
