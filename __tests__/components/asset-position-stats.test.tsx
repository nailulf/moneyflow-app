import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { AssetPositionStats } from '@/components/features/portfolio/AssetPositionStats'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

describe('AssetPositionStats', () => {
  it('shows avg buy price and book value; current price + P/L are placeholders', () => {
    wrap(<AssetPositionStats holding={{ id: 'h1', account_id: 'a', asset_class: 'IDX_STOCK', symbol: 'BBCA', name: 'Bank Central Asia', quantity: 200, purchase_price: 9500, current_value: 1_900_000, currency: 'IDR' } as never} />)
    expect(screen.getByText(en.portfolio.position.avgBuyPrice)).toBeInTheDocument()
    expect(screen.getByText('2 lots')).toBeInTheDocument()
    expect(screen.getAllByText(en.portfolio.position.placeholder).length).toBeGreaterThan(0)
  })
})
