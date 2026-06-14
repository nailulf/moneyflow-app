import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }))

import { YearlyBudgetPreview } from '@/components/features/budget/YearlyBudgetPreview'

const rows = [
  { categoryId: 'c1', name: 'Holiday Travel', amount: 5_000_000, pct: 44 },
  { categoryId: 'c2', name: 'Insurance', amount: 3_600_000, pct: 32 },
]

describe('YearlyBudgetPreview', () => {
  it('renders the hero, budget-type split, and yearly categories when a monthly plan exists', () => {
    render(
      <YearlyBudgetPreview
        heroLabel="Annual Budget · 2025"
        yearlyTotal={11_300_000}
        monthlyTotal={8_500_000}
        currency="IDR"
        rows={rows}
      />
    )
    expect(screen.getByText('Annual Budget · 2025')).toBeInTheDocument()
    expect(screen.getByText('yearlyPreview.splitTitle')).toBeInTheDocument()
    expect(screen.getByText('yearlyPreview.monthlyRecurring')).toBeInTheDocument()
    expect(screen.getByText('yearlyPreview.yearlyOneTime')).toBeInTheDocument()
    expect(screen.getByText('yearlyPreview.categoriesTitle')).toBeInTheDocument()
    expect(screen.getByText('Holiday Travel')).toBeInTheDocument()
    expect(screen.getByText('Insurance')).toBeInTheDocument()
  })

  it('hides the monthly-recurring row when there is no monthly plan', () => {
    render(
      <YearlyBudgetPreview
        heroLabel="Annual Budget · 2025"
        yearlyTotal={11_300_000}
        monthlyTotal={0}
        currency="IDR"
        rows={rows}
      />
    )
    expect(screen.queryByText('yearlyPreview.monthlyRecurring')).not.toBeInTheDocument()
    expect(screen.getByText('yearlyPreview.yearlyOneTime')).toBeInTheDocument()
  })
})
