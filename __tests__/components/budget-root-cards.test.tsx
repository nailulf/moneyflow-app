import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
}))

import { BudgetOverview } from '@/components/features/budget/BudgetOverview'
import { CategoryBudgetList } from '@/components/features/budget/CategoryBudgetList'

describe('BudgetOverview', () => {
  const data = { budget: 8_500_000, spent: 5_200_000, left: 3_300_000, pct: 61, over: false }
  it('renders trio values, percentage, and the Edit pill when editable', () => {
    const onEdit = jest.fn()
    render(<BudgetOverview data={data} currency="IDR" editable onEdit={onEdit} />)
    expect(screen.getByText(/8\.500\.000/)).toBeInTheDocument()
    expect(screen.getByText(/overview\.used:\{"pct":61\}/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'overview.edit' }))
    expect(onEdit).toHaveBeenCalled()
  })
  it('hides the Edit pill when not editable (closed snapshots)', () => {
    render(<BudgetOverview data={data} currency="IDR" editable={false} onEdit={() => {}} />)
    expect(screen.queryByRole('button', { name: 'overview.edit' })).not.toBeInTheDocument()
  })
})

describe('CategoryBudgetList', () => {
  const rows = [
    { categoryId: 'c1', name: 'Food & Dining', allocated: 1_500_000, spent: 1_400_000, pct: 93, status: 'warning' as const },
    { categoryId: 'c2', name: 'Shopping', allocated: 700_000, spent: 1_000_000, pct: 143, status: 'over' as const },
  ]
  it('renders rows with names, allocations, spent sub-lines and an Over badge', () => {
    render(<CategoryBudgetList rows={rows} currency="IDR" />)
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument()
    expect(screen.getAllByText(/categories\.spentSub:/)).toHaveLength(2)
    expect(screen.getByText('categories.over')).toBeInTheDocument()
  })
  it('renders the empty message when no rows', () => {
    render(<CategoryBudgetList rows={[]} currency="IDR" />)
    expect(screen.getByText('categories.empty')).toBeInTheDocument()
  })
})
