import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { PortfolioEmptyState } from '@/components/features/portfolio/PortfolioEmptyState'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

describe('PortfolioEmptyState', () => {
  it('renders the headline, 3 steps, and the add-account CTA', () => {
    const onAdd = jest.fn()
    wrap(<PortfolioEmptyState onAddAccount={onAdd} />)
    expect(screen.getByText(en.portfolio.empty.title)).toBeInTheDocument()
    expect(screen.getByText(en.portfolio.empty.step1Title)).toBeInTheDocument()
    expect(screen.getByText(en.portfolio.empty.step2Title)).toBeInTheDocument()
    expect(screen.getByText(en.portfolio.empty.step3Title)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: en.portfolio.empty.addCta }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })
})
