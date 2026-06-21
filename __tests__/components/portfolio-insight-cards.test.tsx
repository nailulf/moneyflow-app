import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import en from '@/messages/en.json'

jest.mock('next-intl', () => ({
  useTranslations: (ns: string) => {
    const msgs = require('@/messages/en.json')
    const section = ns.split('.').reduce((o: Record<string, unknown>, k: string) => (o as Record<string, unknown>)[k] as Record<string, unknown>, msgs)
    return (key: string) => (section as Record<string, string>)[key] ?? key
  },
}))

import { AccountInsightCards } from '@/components/features/portfolio/AccountInsightCards'

const wrap = (ui: React.ReactNode) => render(<>{ui}</>)

describe('AccountInsightCards', () => {
  it('renders Performance, Income, Health as placeholders', () => {
    wrap(<AccountInsightCards />)
    expect(screen.getByText(en.portfolio.insights.performance)).toBeInTheDocument()
    expect(screen.getByText(en.portfolio.insights.income)).toBeInTheDocument()
    expect(screen.getByText(en.portfolio.insights.health)).toBeInTheDocument()
    // each card shows the "needs price data" placeholder
    expect(screen.getAllByText(en.portfolio.insights.placeholder)).toHaveLength(3)
  })
})
