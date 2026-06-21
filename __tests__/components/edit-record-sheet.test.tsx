import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { EditRecordSheet } from '@/components/features/portfolio/EditRecordSheet'
import en from '@/messages/en.json'
import * as api from '@/lib/api/investment-transactions'

jest.mock('@/lib/api/investment-transactions')
const holding = { id: 'h1', account_id: 'a1', asset_class: 'IDX_STOCK', symbol: 'BBCA', name: 'BCA', quantity: 200, purchase_price: 9500, current_value: 1900000, currency: 'IDR' } as never
const txn = { id: 't1', type: 'BUY', quantity: 200, price_per_unit: 9500, total_amount: 1900000, transaction_date: '2026-06-01', currency: 'IDR' } as never
const wrap = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

it('saves an edit (base-unit quantity) and deletes', async () => {
  ;(api.updateTransaction as jest.Mock).mockResolvedValue({ id: 't1' })
  ;(api.deleteTransaction as jest.Mock).mockResolvedValue(undefined)
  const onDone = jest.fn()
  wrap(<EditRecordSheet open txn={txn} holding={holding} accountId="a1" onClose={() => {}} onDone={onDone} />)
  // pre-filled with 2 lots (200 shares); change to 3 lots
  fireEvent.change(screen.getByTestId('trade-qty'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: en.portfolio.trade.save }))
  await waitFor(() => expect(api.updateTransaction).toHaveBeenCalledWith('a1', 'h1', 't1',
    expect.objectContaining({ quantity: 300 })))
  fireEvent.click(screen.getByRole('button', { name: en.portfolio.trade.delete }))
  fireEvent.click(screen.getByRole('button', { name: en.portfolio.trade.confirmDeleteRecord }))
  await waitFor(() => expect(api.deleteTransaction).toHaveBeenCalledWith('a1', 'h1', 't1'))
})
