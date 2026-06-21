import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { SellSheet } from '@/components/features/portfolio/SellSheet'
import en from '@/messages/en.json'
import * as api from '@/lib/api/investment-transactions'

jest.mock('@/lib/api/investment-transactions')
const holding = { id: 'h1', account_id: 'a1', asset_class: 'IDX_STOCK', symbol: 'BBCA', name: 'Bank Central Asia', quantity: 200, purchase_price: 9500, current_value: 1900000, currency: 'IDR' } as never
const wrap = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

it('blocks oversell and submits SELL with proceeds_to_cash when toggled on', async () => {
  ;(api.addTransaction as jest.Mock).mockResolvedValue({ id: 't2' })
  const onDone = jest.fn()
  wrap(<SellSheet open holding={holding} accountId="a1" onClose={() => {}} onDone={onDone} />)
  // oversell: 3 lots = 300 > 200 held → confirm disabled
  fireEvent.change(screen.getByTestId('trade-qty'), { target: { value: '3' } })
  fireEvent.change(screen.getByTestId('trade-price'), { target: { value: '12000' } })
  expect(screen.getByRole('button', { name: en.portfolio.trade.confirmSell })).toBeDisabled()
  // valid: 1 lot = 100 ≤ 200, toggle keep-as-cash on
  fireEvent.change(screen.getByTestId('trade-qty'), { target: { value: '1' } })
  fireEvent.click(screen.getByTestId('keep-as-cash'))
  fireEvent.click(screen.getByRole('button', { name: en.portfolio.trade.confirmSell }))
  await waitFor(() => expect(api.addTransaction).toHaveBeenCalledWith('a1', 'h1',
    expect.objectContaining({ type: 'SELL', quantity: 100, price_per_unit: 12000, proceeds_to_cash: true })))
  await waitFor(() => expect(onDone).toHaveBeenCalled())
})
