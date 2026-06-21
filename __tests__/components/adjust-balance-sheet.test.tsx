import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: any) => (v?.amount ?? k) }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() } }))
import { AdjustBalanceSheet } from '@/components/features/accounts/detail/AdjustBalanceSheet'

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })) as any
})

it('previews the delta and posts the new balance', async () => {
  const onSaved = jest.fn()
  render(<AdjustBalanceSheet open onOpenChange={() => {}} accountId="acc-1" currentBalance={45200000} currency="IDR" onSaved={onSaved} />)

  fireEvent.change(screen.getByLabelText('adjustDialog.newBalance'), { target: { value: '47000000' } })
  // preview shows the +1.800.000 delta (formatted amount injected via t-mock).
  // The amount is rendered in both the delta badge and the info banner, so
  // assert at least one match rather than a single element.
  expect(screen.getAllByText(/1.800.000|1,800,000/).length).toBeGreaterThan(0)

  fireEvent.click(screen.getByRole('button', { name: 'adjustDialog.save' }))

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    '/api/accounts/acc-1/adjust-balance',
    expect.objectContaining({ method: 'POST' }),
  ))
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
  expect(body.new_balance).toBe(47000000)
  await waitFor(() => expect(onSaved).toHaveBeenCalled())
})

it('disables save when there is no change', () => {
  render(<AdjustBalanceSheet open onOpenChange={() => {}} accountId="acc-1" currentBalance={100} currency="IDR" onSaved={() => {}} />)
  expect(screen.getByRole('button', { name: 'adjustDialog.save' })).toBeDisabled()
})
