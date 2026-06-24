import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { ForecastHero } from '@/components/features/forecast/ForecastHero'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

describe('ForecastHero', () => {
  it('renders projected net worth with goal progress when target is set', () => {
    const projected = 4_850_000_000
    const target = 5_000_000_000
    const expectedPct = Math.round((projected / target) * 100)

    wrap(
      <ForecastHero
        projectedNetWorth={projected}
        currentNetWorth={600_000_000}
        targetNetWorth={target}
        successRate={87}
        horizonYears={20}
        endYear={2046}
      />
    )

    // Verify projected amount is displayed
    expect(screen.getByText(/4[.,]85/)).toBeInTheDocument()

    // Verify goal progress bar shows correct percentage
    expect(screen.getByText(`${expectedPct}% to goal`)).toBeInTheDocument()

    // Verify success rate is displayed
    expect(screen.getByText('87%')).toBeInTheDocument()

    // Verify the goal block is rendered
    expect(screen.getByText(/to goal/i)).toBeInTheDocument()
  })

  it('does not render goal progress block when target is 0', () => {
    wrap(
      <ForecastHero
        projectedNetWorth={4_850_000_000}
        currentNetWorth={600_000_000}
        targetNetWorth={0}
        successRate={87}
        horizonYears={20}
        endYear={2046}
      />
    )

    // Goal block should not be rendered
    expect(screen.queryByText(/to goal/i)).not.toBeInTheDocument()

    // Component should still render without crashing
    expect(screen.getByText('Success rate')).toBeInTheDocument()
  })

  it('displays dash when success rate is null', () => {
    wrap(
      <ForecastHero
        projectedNetWorth={4_850_000_000}
        currentNetWorth={600_000_000}
        targetNetWorth={5_000_000_000}
        successRate={null}
        horizonYears={20}
        endYear={2046}
      />
    )

    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
