import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({
  useTranslations: () => (k: string) => ({ prevMonth: 'Previous month', nextMonth: 'Next month' }[k] ?? k),
  useLocale: () => 'en',
}))
import { MonthSummaryBar } from '@/components/features/transaction/MonthSummaryBar'

describe('MonthSummaryBar', () => {
  it('renders income/expense totals and steps months', () => {
    const onChange = jest.fn()
    render(<MonthSummaryBar month={{ year: 2025, month: 5 }} onMonthChange={onChange} income={12500000} expense={5200000} />)
    expect(screen.getByText(/12.5/)).toBeInTheDocument() // compact income
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }))
    expect(onChange).toHaveBeenCalledWith({ year: 2025, month: 4 })
    fireEvent.click(screen.getByRole('button', { name: /next month/i }))
    expect(onChange).toHaveBeenCalledWith({ year: 2025, month: 6 })
  })
})
