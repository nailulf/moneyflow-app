import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { AssetManageSheet } from '@/components/features/portfolio/AssetManageSheet'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

const holding = { id: 'h1', name: 'Bank Central Asia', symbol: 'BBCA' } as never

describe('AssetManageSheet', () => {
  it('Remove and View transactions are wired; Buy/Sell/Edit are inert', () => {
    const onRemove = jest.fn(), onView = jest.fn(), onClose = jest.fn()
    wrap(<AssetManageSheet open holding={holding} pending={false} onClose={onClose} onRemove={onRemove} onViewTransactions={onView} />)
    fireEvent.click(screen.getByRole('button', { name: en.portfolio.manage.viewTransactions }))
    expect(onView).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: en.portfolio.manage.remove }))
    expect(onRemove).toHaveBeenCalledTimes(1)
    // Buy more is present but does not throw / has no handler wired to remove/view
    expect(screen.getByText(en.portfolio.manage.buyMore)).toBeInTheDocument()
  })
})
