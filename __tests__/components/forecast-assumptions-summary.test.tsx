import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { ForecastAssumptionsSummary } from '@/components/features/forecast/ForecastAssumptionsSummary'
import { defaultScenarioPayload } from '@/lib/forecast/types'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

describe('ForecastAssumptionsSummary', () => {
  it('renders chips with correct values and Income highlighted', () => {
    const draft = {
      ...defaultScenarioPayload,
      expected_annual_return: 0.07,
      inflation_rate: 0.03,
      annual_income_growth: 0.06,
      monthly_contribution: 2_000_000,
      horizon_years: 20,
    }
    const onEdit = jest.fn()

    wrap(<ForecastAssumptionsSummary scenarioDraft={draft} onEdit={onEdit} />)

    // Check all chips render with correct values
    expect(screen.getByText(/Return 7%/)).toBeInTheDocument()
    expect(screen.getByText(/Inflation 3%/)).toBeInTheDocument()
    expect(screen.getByText(/Income \+6%\/yr/)).toBeInTheDocument()
    expect(screen.getByText(/Contribute/)).toBeInTheDocument()
    expect(screen.getByText(/Horizon 20y/)).toBeInTheDocument()
  })

  it('omits Contribute chip when monthly_contribution is 0', () => {
    const draft = {
      ...defaultScenarioPayload,
      expected_annual_return: 0.07,
      inflation_rate: 0.03,
      annual_income_growth: 0.06,
      monthly_contribution: 0,
      horizon_years: 20,
    }
    const onEdit = jest.fn()

    wrap(<ForecastAssumptionsSummary scenarioDraft={draft} onEdit={onEdit} />)

    expect(screen.queryByText(/Contribute/)).not.toBeInTheDocument()
  })

  it('calls onEdit when Edit button is clicked', async () => {
    const draft = {
      ...defaultScenarioPayload,
      expected_annual_return: 0.07,
      inflation_rate: 0.03,
      annual_income_growth: 0.06,
      monthly_contribution: 2_000_000,
      horizon_years: 20,
    }
    const onEdit = jest.fn()

    wrap(<ForecastAssumptionsSummary scenarioDraft={draft} onEdit={onEdit} />)

    const editButton = screen.getByText('Edit')
    await userEvent.click(editButton)

    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})
