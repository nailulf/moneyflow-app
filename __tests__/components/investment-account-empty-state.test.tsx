import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { InvestmentAccountEmptyState } from '@/components/features/portfolio/InvestmentAccountEmptyState'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

describe('InvestmentAccountEmptyState', () => {
  it('renders the no-assets state and chips route by asset class', () => {
    const onAdd = jest.fn()
    wrap(<InvestmentAccountEmptyState accountName="Stockbit — Growth" onAddAsset={onAdd} />)
    expect(screen.getByText(en.portfolio.accountEmpty.title)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: en.portfolio.accountEmpty.chipIdx }))
    expect(onAdd).toHaveBeenCalledWith('IDX_STOCK')
  })
})
