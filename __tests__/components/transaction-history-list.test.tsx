import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { TransactionHistoryList } from '@/components/features/portfolio/TransactionHistoryList'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

describe('TransactionHistoryList', () => {
  it('renders a buy and a sell row newest-first (non-IDX, shows units)', () => {
    wrap(<TransactionHistoryList currency="IDR" assetClass="US_STOCK" transactions={[
      { id: 't1', type: 'BUY', quantity: 100, total_amount: 950_000, transaction_date: '2026-06-07' } as never,
      { id: 't2', type: 'SELL', quantity: 50, total_amount: 600_000, transaction_date: '2026-03-15' } as never,
    ]} />)
    expect(screen.getByText(en.portfolio.history.buy)).toBeInTheDocument()
    expect(screen.getByText(en.portfolio.history.sell)).toBeInTheDocument()
    expect(screen.getByText(`+100 ${en.portfolio.unit.units}`)).toBeInTheDocument()
    expect(screen.getByText(`−50 ${en.portfolio.unit.units}`)).toBeInTheDocument()
  })
  it('renders IDX_STOCK quantities as lots', () => {
    wrap(<TransactionHistoryList currency="IDR" assetClass="IDX_STOCK" transactions={[
      { id: 't3', type: 'BUY', quantity: 10000, total_amount: 9_500_000, transaction_date: '2026-06-07' } as never,
    ]} />)
    expect(screen.getByText(`+100 ${en.portfolio.unit.lots}`)).toBeInTheDocument()
  })
  it('renders an empty hint when there are no rows', () => {
    wrap(<TransactionHistoryList currency="IDR" assetClass="OTHER" transactions={[]} />)
    expect(screen.getByText(en.portfolio.history.empty)).toBeInTheDocument()
  })
})
