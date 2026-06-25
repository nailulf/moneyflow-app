import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import en from '@/messages/en.json'

global.ResizeObserver =
  global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const push = jest.fn()
const back = jest.fn()
const replace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back, replace }),
  useSearchParams: () => ({ get: () => 's1' }),
}))

const mutateAsync = jest.fn().mockResolvedValue(undefined)

const events = [
  {
    id: 'e1',
    name: 'New House',
    event_type: 'PROPERTY',
    event_date: '2030-06-01',
    amount: 500000000,
    is_enabled: true,
    details: {},
  },
  {
    id: 'e2',
    name: 'Wedding Day',
    event_type: 'WEDDING',
    event_date: '2028-09-01',
    amount: 200000000,
    is_enabled: true,
    details: {},
  },
]

let eventsData: unknown[] = events

jest.mock('@/hooks/useForecastQuery', () => ({
  useForecastEvents: () => ({ data: eventsData }),
  useToggleEvent: () => ({ mutateAsync }),
  useForecastUserDOB: () => ({ data: null }),
}))

import EventsPage from '@/app/forecast/events/page'

const wrap = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <EventsPage />
    </NextIntlClientProvider>
  )

describe('EventsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    eventsData = events
  })

  it('renders both event names', () => {
    wrap()
    expect(screen.getByText('New House')).toBeInTheDocument()
    expect(screen.getByText('Wedding Day')).toBeInTheDocument()
  })

  it('navigates to the new-event route when Add is clicked', () => {
    wrap()
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(push).toHaveBeenCalledWith('/forecast/events/new?scenario=s1')
  })

  it('renders the category grid empty state when there are no events', () => {
    eventsData = []
    wrap()
    expect(screen.getByText('Buy a home')).toBeInTheDocument()
  })
})
