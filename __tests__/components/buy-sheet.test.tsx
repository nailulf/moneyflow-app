import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { BuySheet } from '@/components/features/portfolio/BuySheet'
import en from '@/messages/en.json'
import * as api from '@/lib/api/investment-transactions'

jest.mock('@/lib/api/investment-transactions')
const holding = { id: 'h1', account_id: 'a1', asset_class: 'IDX_STOCK', symbol: 'BBCA', name: 'Bank Central Asia', quantity: 200, purchase_price: 9500, current_value: 1900000, currency: 'IDR' } as never
const wrap = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

it('BuySheet submits a BUY with base-unit quantity', async () => {
  ;(api.addTransaction as jest.Mock).mockResolvedValue({ id: 't1' })
  const onDone = jest.fn()
  wrap(<BuySheet open holding={holding} accountId="a1" onClose={() => {}} onDone={onDone} />)
  fireEvent.change(screen.getByTestId('trade-qty'), { target: { value: '2' } })       // 2 lots
  fireEvent.change(screen.getByTestId('trade-price'), { target: { value: '9500' } })
  fireEvent.click(screen.getByRole('button', { name: en.portfolio.trade.confirmBuy }))
  await waitFor(() => expect(api.addTransaction).toHaveBeenCalledWith('a1', 'h1',
    expect.objectContaining({ type: 'BUY', quantity: 200, price_per_unit: 9500 })))
  await waitFor(() => expect(onDone).toHaveBeenCalled())
})
