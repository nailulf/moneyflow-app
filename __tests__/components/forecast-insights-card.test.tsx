import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { ForecastInsightsCard } from '@/components/features/forecast/ForecastInsightsCard'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  )

describe('ForecastInsightsCard', () => {
  it('renders multiple insights with their translated text', () => {
    wrap(
      <ForecastInsightsCard
        insights={[
          { code: 'lowSuccess', targetNetWorth: 5_000_000_000 },
          { code: 'highVolatility' },
        ]}
      />
    )

    // Should render two paragraphs
    const paragraphs = screen.getAllByRole('paragraph')
    expect(paragraphs).toHaveLength(2)

    // High volatility insight text should appear
    expect(screen.getByText(/High volatility increases downside risk/)).toBeInTheDocument()
  })

  it('renders on-track insight', () => {
    wrap(<ForecastInsightsCard insights={[{ code: 'onTrack' }]} />)

    expect(screen.getByText(/Scenario is on track/)).toBeInTheDocument()
  })

  it('renders null when insights array is empty', () => {
    const { container } = wrap(<ForecastInsightsCard insights={[]} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders lowSuccess with formatted target amount', () => {
    wrap(
      <ForecastInsightsCard
        insights={[{ code: 'lowSuccess', targetNetWorth: 5_000_000_000 }]}
      />
    )

    // Should contain both the lowSuccess message and the target amount
    expect(screen.getByText(/Less than half of simulated paths end/)).toBeInTheDocument()
    expect(screen.getByText(/Rp 5\.000\.000\.000/)).toBeInTheDocument()
  })

  it('renders highSuccess with formatted target amount', () => {
    wrap(
      <ForecastInsightsCard
        insights={[{ code: 'highSuccess', targetNetWorth: 2_000_000_000 }]}
      />
    )

    expect(screen.getByText(/Strong forecast: 90%/)).toBeInTheDocument()
    expect(screen.getByText(/Rp 2\.000\.000\.000/)).toBeInTheDocument()
  })

  it('renders negativeCashflowMonths with months count', () => {
    wrap(
      <ForecastInsightsCard
        insights={[{ code: 'negativeCashflowMonths', months: 6 }]}
      />
    )

    expect(screen.getByText(/Negative median cashflow \(6-month sample\)/)).toBeInTheDocument()
  })

  it('renders belowToday insight', () => {
    wrap(<ForecastInsightsCard insights={[{ code: 'belowToday' }]} />)

    expect(screen.getByText(/Projected median wealth ends below today/)).toBeInTheDocument()
  })

  it('renders negativeCashflow insight', () => {
    wrap(<ForecastInsightsCard insights={[{ code: 'negativeCashflow' }]} />)

    expect(screen.getByText(/Negative average cashflow drags/)).toBeInTheDocument()
  })

  it('renders target as positive when targetNetWorth is 0', () => {
    wrap(
      <ForecastInsightsCard
        insights={[{ code: 'lowSuccess', targetNetWorth: 0 }]}
      />
    )

    expect(screen.getByText(/positive/)).toBeInTheDocument()
  })
})
