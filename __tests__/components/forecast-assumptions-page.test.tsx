import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import en from '@/messages/en.json'

global.ResizeObserver =
  global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({ get: () => 's1' }),
}))

const saveMutate = jest.fn().mockResolvedValue({ id: 's1' })
const deleteMutate = jest.fn().mockResolvedValue(undefined)
const createMutate = jest.fn().mockResolvedValue({ id: 's2' })

const scenario = {
  id: 's1',
  name: 'Base',
  description: 'Default forecast',
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
}

const otherScenario = { ...scenario, id: 's2', name: 'Aggressive', is_default: false }

jest.mock('@/hooks/useForecastQuery', () => ({
  useForecastScenarios: () => ({ data: [scenario, otherScenario] }),
  useForecastCashflow: () => ({
    data: { annualIncome: 0, annualExpenses: 0, monthsUsed: 0, median: 0 },
  }),
  useSaveScenario: () => ({ mutateAsync: saveMutate, isPending: false }),
  useDeleteScenario: () => ({ mutateAsync: deleteMutate, isPending: false }),
  useCreateScenario: () => ({ mutateAsync: createMutate, isPending: false }),
}))

import AssumptionsPage from '@/app/forecast/assumptions/page'

const wrap = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AssumptionsPage />
    </NextIntlClientProvider>
  )

describe('AssumptionsPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the header title', () => {
    wrap()
    expect(screen.getByRole('heading', { name: 'Assumptions' })).toBeInTheDocument()
  })

  it('saves the scenario draft when the CTA is clicked', async () => {
    wrap()
    fireEvent.click(screen.getByRole('button', { name: 'Save assumptions' }))
    await waitFor(() =>
      expect(saveMutate).toHaveBeenCalledWith({
        scenarioId: 's1',
        draft: expect.any(Object),
      })
    )
  })

  it('deletes the scenario when Delete scenario is clicked', async () => {
    wrap()
    fireEvent.click(screen.getByRole('button', { name: 'Delete scenario' }))
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('s1'))
  })
})
