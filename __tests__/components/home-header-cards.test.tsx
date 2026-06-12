import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
}))
jest.mock('@/components/features/navigation/nav-user', () => ({
  NavUser: ({ user }: { user: { name: string } }) => <div data-testid="nav-user">{user.name}</div>,
}))

import { HomeGreetingHeader } from '@/components/features/home/HomeGreetingHeader'
import { TodayCard } from '@/components/features/home/TodayCard'

const user = { name: 'Nailul Fadloil', email: 'n@example.com', avatar: '/avatars/01.svg' }

describe('HomeGreetingHeader', () => {
  it('renders the greeting key, the user name as h1, and NavUser', () => {
    render(<HomeGreetingHeader greetingKey="morning" user={user} />)
    expect(screen.getByText('greeting.morning')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Nailul Fadloil' })).toBeInTheDocument()
    expect(screen.getByTestId('nav-user')).toBeInTheDocument()
  })
})

describe('TodayCard', () => {
  it('shows the formatted date label, spent amount and count', () => {
    render(<TodayCard dateLabel="Today, Jun 12" spent={57000} count={2} currency="IDR" />)
    expect(screen.getByText('Today, Jun 12')).toBeInTheDocument()
    expect(screen.getByText(/57\.000/)).toBeInTheDocument()
    expect(screen.getByText(/today\.logged:\{"count":2\}/)).toBeInTheDocument()
  })
})
