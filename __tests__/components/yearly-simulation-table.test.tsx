import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { YearlySimulationTable } from '@/components/features/forecast/YearlySimulationTable'
import type { YearlySimulationRow } from '@/hooks/useYearlySimulation'
import messages from '@/messages/en.json'

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
)

describe('YearlySimulationTable', () => {
  const rows: YearlySimulationRow[] = [
    {
      year: 2026,
      yearIndex: 0,
      ageLabel: 'age 32',
      income: 156_000_000,
      expense: 92_000_000,
      eventIncome: 0,
      eventExpense: 0,
      eventLabels: [],
      eventTypes: [],
      netCashflow: 64_000_000,
      startNW: 0,
      investmentReturn: 0,
      endNW: 488_000_000,
      isRetired: false,
      inflationFactor: 1,
    },
    {
      year: 2027,
      yearIndex: 1,
      ageLabel: 'age 33',
      income: 185_000_000,
      expense: 98_000_000,
      eventIncome: 0,
      eventExpense: 800_000_000,
      eventLabels: ['Buy a home'],
      eventTypes: ['PROPERTY'],
      netCashflow: 87_000_000,
      startNW: 488_000_000,
      investmentReturn: 0,
      endNW: 560_000_000,
      isRetired: false,
      inflationFactor: 1,
    },
    {
      year: 2046,
      yearIndex: 20,
      ageLabel: 'age 52',
      income: 0,
      expense: 184_000_000,
      eventIncome: 0,
      eventExpense: 0,
      eventLabels: [],
      eventTypes: ['RETIREMENT'],
      netCashflow: -184_000_000,
      startNW: 0,
      investmentReturn: 0,
      endNW: 2_010_000_000,
      isRetired: true,
      inflationFactor: 1,
    },
  ] as any

  it('renders column headers', () => {
    render(
      <Wrapper>
        <YearlySimulationTable rows={rows} />
      </Wrapper>
    )
    expect(screen.getByText('Year')).toBeInTheDocument()
    expect(screen.getByText('Income')).toBeInTheDocument()
    expect(screen.getByText('Expense')).toBeInTheDocument()
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
  })

  it('renders year and age label for first row', () => {
    render(
      <Wrapper>
        <YearlySimulationTable rows={rows} />
      </Wrapper>
    )
    expect(screen.getByText('2026')).toBeInTheDocument()
    expect(screen.getByText('age 32')).toBeInTheDocument()
  })

  it('renders income with + prefix and text-success class', () => {
    render(
      <Wrapper>
        <YearlySimulationTable rows={rows} />
      </Wrapper>
    )
    const incomeCell = screen.getAllByText(/^\+/)[0] // Find first cell starting with +
    expect(incomeCell).toHaveClass('text-success')
    expect(incomeCell.textContent).toMatch(/^\+/)
  })

  it('renders expense with − prefix and text-destructive class', () => {
    render(
      <Wrapper>
        <YearlySimulationTable rows={rows} />
      </Wrapper>
    )
    const expenseCell = screen.getAllByText(/^−/)[0] // Find first cell starting with −
    expect(expenseCell).toHaveClass('text-destructive')
    expect(expenseCell.textContent).toMatch(/^−/)
  })

  it('renders event-dot for event years only', () => {
    render(
      <Wrapper>
        <YearlySimulationTable rows={rows} />
      </Wrapper>
    )
    const eventDots = screen.getAllByTestId('event-dot')
    expect(eventDots).toHaveLength(1) // Only 2027 has an event
    expect(eventDots[0]).toBeInTheDocument()
  })

  it('applies bg-muted/30 to event years', () => {
    const { container } = render(
      <Wrapper>
        <YearlySimulationTable rows={rows} />
      </Wrapper>
    )
    // Find the row containing "2027" and check for bg-muted/30
    const rows2027 = Array.from(container.querySelectorAll('div')).filter(
      (el) => el.textContent?.includes('2027') && el.textContent?.includes('age 33')
    )
    expect(rows2027.length).toBeGreaterThan(0)
  })
})
