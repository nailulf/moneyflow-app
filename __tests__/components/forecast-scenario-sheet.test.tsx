import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { ForecastScenarioSheet } from '@/components/features/forecast/ForecastScenarioSheet'
import type { ForecastScenario } from '@/lib/forecast/types'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

const makeScenario = (overrides: Partial<ForecastScenario>): ForecastScenario => ({
  id: 'scenario-1',
  user_id: 'user-1',
  name: 'Base Scenario',
  description: null,
  start_date: '2026-01-01',
  horizon_years: 10,
  expected_annual_return: 0.07,
  annual_volatility: 0.12,
  inflation_rate: 0.03,
  annual_income_growth: 0,
  monthly_contribution: 0,
  monthly_withdrawal: 0,
  include_cashflow: true,
  is_default: true,
  target_net_worth: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('ForecastScenarioSheet', () => {
  it('renders all scenario names and calls onSelect with the tapped scenario id', () => {
    const scenarios = [
      makeScenario({ id: 'aggressive', name: 'Aggressive', is_default: true }),
      makeScenario({ id: 'conservative', name: 'Conservative', is_default: false }),
    ]
    const onSelect = jest.fn()
    const onOpenChange = jest.fn()

    wrap(
      <ForecastScenarioSheet
        open
        onOpenChange={onOpenChange}
        scenarios={scenarios}
        selectedScenarioId="aggressive"
        onSelect={onSelect}
      />
    )

    expect(screen.getByText('Aggressive')).toBeInTheDocument()
    expect(screen.getByText('Conservative')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Conservative'))

    expect(onSelect).toHaveBeenCalledWith('conservative')
  })
})
