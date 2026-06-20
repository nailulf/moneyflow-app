import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k)
    return t
  },
}))

import { PortfolioValueHero } from '@/components/features/portfolio/PortfolioValueHero'
import { AllocationBars } from '@/components/features/portfolio/AllocationBars'
import { TopHoldingsCard } from '@/components/features/portfolio/TopHoldingsCard'

describe('PortfolioValueHero', () => {
  it('renders total value, gain placeholder, and asset count', () => {
    render(<PortfolioValueHero totalValue={48750000} totalGainLoss={3250000} totalGainLossPct={7.1} assetCount={5} currency="IDR" />)
    expect(screen.getByText(/48\.750\.000/)).toBeInTheDocument()
    // gain is now a placeholder, not a computed number
    expect(screen.getByText('hero.gainPlaceholder')).toBeInTheDocument()
    expect(screen.getByText(/hero\.assets:\{"count":5\}/)).toBeInTheDocument()
  })
  it('renders placeholder regardless of gain/loss direction', () => {
    render(<PortfolioValueHero totalValue={100} totalGainLoss={-50} totalGainLossPct={-5} assetCount={1} currency="IDR" />)
    expect(screen.getByText('hero.gainPlaceholder')).toBeInTheDocument()
  })
})

describe('AllocationBars', () => {
  it('renders a labelled bar per class with its percentage', () => {
    render(<AllocationBars slices={[{ assetClass: 'IDX_STOCK', value: 750, pct: 75 }, { assetClass: 'MUTUAL_FUND', value: 250, pct: 25 }]} />)
    expect(screen.getByText('class.IDX_STOCK')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('class.MUTUAL_FUND')).toBeInTheDocument()
  })
})

describe('TopHoldingsCard', () => {
  const rows = [{ id: 'h1', symbol: 'BBCA', name: 'Bank Central Asia', assetClass: 'IDX_STOCK' as const, value: 990000, gainLoss: 90000, currency: 'IDR' }]
  it('renders holding name, symbol and value', () => {
    render(<TopHoldingsCard rows={rows} />)
    expect(screen.getByText('Bank Central Asia')).toBeInTheDocument()
    expect(screen.getByText('BBCA')).toBeInTheDocument()
    expect(screen.getByText(/990\.000/)).toBeInTheDocument()
  })
  it('renders the empty message when no rows', () => {
    render(<TopHoldingsCard rows={[]} />)
    expect(screen.getByText('top.empty')).toBeInTheDocument()
  })
})
