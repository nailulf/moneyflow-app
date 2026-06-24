import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { AssumptionsForm } from '@/components/features/forecast/AssumptionsForm'
import { defaultScenarioPayload, type ScenarioDraft } from '@/lib/forecast/types'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

const makeDraft = (): ScenarioDraft => ({
  ...defaultScenarioPayload,
  expected_annual_return: 0.07,
  annual_income_growth: 0.06,
  monthly_contribution: 2_000_000,
  horizon_years: 20,
  include_cashflow: true,
})

describe('AssumptionsForm', () => {
  it('shows the income-growth percent as 6 and emits 0.08 when changed to 8', () => {
    const onChange = jest.fn()
    wrap(
      <AssumptionsForm
        draft={makeDraft()}
        onChange={onChange}
        monthlyCashflow={5_000_000}
        cashflowMonthsUsed={6}
      />
    )

    const input = screen.getByTestId('assumptions-income-growth') as HTMLInputElement
    expect(input.value).toBe('6')

    fireEvent.change(input, { target: { value: '8' } })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ annual_income_growth: 0.08 })
    )
  })

  it('renders the target-net-worth currency field', () => {
    const onChange = jest.fn()
    wrap(
      <AssumptionsForm
        draft={makeDraft()}
        onChange={onChange}
        monthlyCashflow={5_000_000}
        cashflowMonthsUsed={6}
      />
    )

    expect(screen.getByTestId('assumptions-target-net-worth')).toBeInTheDocument()
  })

  it('flips include_cashflow when the source switch is toggled', () => {
    const onChange = jest.fn()
    wrap(
      <AssumptionsForm
        draft={makeDraft()}
        onChange={onChange}
        monthlyCashflow={5_000_000}
        cashflowMonthsUsed={6}
      />
    )

    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ include_cashflow: false })
    )
  })
})
