import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

import TransactionsPage from '@/app/transactions/page'
import BudgetPage from '@/app/budget/page'

describe('placeholder routes', () => {
  it('transactions page renders a heading', () => {
    render(<TransactionsPage />)
    expect(screen.getByRole('heading', { level: 1, name: /transactions/i })).toBeInTheDocument()
  })
  it('budget page renders a heading', () => {
    render(<BudgetPage />)
    expect(screen.getByRole('heading', { level: 1, name: /budget/i })).toBeInTheDocument()
  })
})
