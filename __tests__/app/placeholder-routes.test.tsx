import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

import BudgetPage from '@/app/budget/page'

describe('placeholder routes', () => {
  // The page h1 is provided by LayoutWrapper's MobileScreenHeader (mobile) /
  // global header (desktop); the placeholder itself must NOT add another one.
  it('budget page renders the coming-soon note without its own heading', () => {
    render(<BudgetPage />)
    expect(screen.getByText('comingSoon')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
