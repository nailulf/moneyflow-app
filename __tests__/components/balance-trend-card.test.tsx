import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: any) => (v?.value ?? k) }))
// Recharts' ChartContainer relies on a ResponsiveContainer/ResizeObserver that
// is unavailable in jsdom and throws on render. The header (title + change
// badge) lives OUTSIDE the chart subtree in the component, so stubbing the
// chart org here keeps the runtime chart intact while letting us assert the
// header/badge. Test-file-only mock — the component renders the real chart at runtime.
jest.mock('@/components/ui/organisms/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
import { BalanceTrendCard } from '@/components/features/accounts/detail/BalanceTrendCard'

it('renders title and a positive change badge', () => {
  render(
    <BalanceTrendCard
      currency="IDR"
      series={[
        { date: '2026-01-01', balance: 28000000 },
        { date: '2026-06-01', balance: 45200000 },
      ]}
    />,
  )
  expect(screen.getByText('trend.title')).toBeInTheDocument()
  expect(screen.getByText(/\+61%/)).toBeInTheDocument()
})

it('renders nothing with a single point', () => {
  const { container } = render(<BalanceTrendCard currency="IDR" series={[{ date: '2026-01-01', balance: 1 }]} />)
  expect(container).toBeEmptyDOMElement()
})
