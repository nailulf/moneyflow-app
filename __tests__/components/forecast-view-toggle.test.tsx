import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { ForecastViewToggle } from '@/components/features/forecast/ForecastViewToggle'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

describe('ForecastViewToggle', () => {
  it('renders both segment labels', () => {
    const onChange = jest.fn()
    wrap(<ForecastViewToggle value="net-worth" onChange={onChange} />)
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
    expect(screen.getByText('Cash Flow')).toBeInTheDocument()
  })

  it('calls onChange with "cash-flow" when Cash Flow segment is clicked', () => {
    const onChange = jest.fn()
    wrap(<ForecastViewToggle value="net-worth" onChange={onChange} />)
    fireEvent.click(screen.getByText('Cash Flow'))
    expect(onChange).toHaveBeenCalledWith('cash-flow')
  })

  it('applies active styling (bg-card) to the active segment', () => {
    const onChange = jest.fn()
    wrap(<ForecastViewToggle value="net-worth" onChange={onChange} />)
    const netWorthButton = screen.getByText('Net Worth').closest('button')
    expect(netWorthButton).toHaveClass('bg-card')
  })

  it('does not apply bg-card to inactive segment', () => {
    const onChange = jest.fn()
    wrap(<ForecastViewToggle value="net-worth" onChange={onChange} />)
    const cashFlowButton = screen.getByText('Cash Flow').closest('button')
    expect(cashFlowButton).not.toHaveClass('bg-card')
  })
})
