import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { ForecastEventsPreview } from '@/components/features/forecast/ForecastEventsPreview'
import type { ForecastEvent } from '@/lib/forecast/types'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

const makeEvent = (over: Partial<ForecastEvent>): ForecastEvent => ({
  id: 'id',
  scenario_id: 'scenario',
  user_id: 'user',
  name: 'Event',
  event_date: '2030-01-01',
  event_type: 'PROPERTY',
  amount: 1_000_000,
  note: null,
  details: {},
  is_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
})

const events: ForecastEvent[] = [
  makeEvent({ id: '1', name: 'Buy a home', event_type: 'PROPERTY', event_date: '2030-06-01', amount: 800_000_000 }),
  makeEvent({ id: '2', name: 'Wedding', event_type: 'WEDDING', event_date: '2028-09-01', amount: 200_000_000 }),
  makeEvent({ id: '3', name: 'First kid', event_type: 'KIDS', event_date: '2031-03-01', amount: 50_000_000 }),
  makeEvent({ id: '4', name: 'College fund', event_type: 'EDUCATION', event_date: '2040-01-01', amount: 300_000_000 }),
]

describe('ForecastEventsPreview', () => {
  it('renders only the first 3 events', () => {
    wrap(<ForecastEventsPreview events={events} onManage={jest.fn()} />)

    expect(screen.getByText('Buy a home')).toBeInTheDocument()
    expect(screen.getByText('Wedding')).toBeInTheDocument()
    expect(screen.getByText('First kid')).toBeInTheDocument()
    expect(screen.queryByText('College fund')).not.toBeInTheDocument()
  })

  it('calls onManage when Manage is clicked', () => {
    const onManage = jest.fn()
    wrap(<ForecastEventsPreview events={events} onManage={onManage} />)

    fireEvent.click(screen.getByRole('button', { name: /manage/i }))
    expect(onManage).toHaveBeenCalledTimes(1)
  })

  it('renders an event amount with expense styling', () => {
    wrap(<ForecastEventsPreview events={[events[0]]} onManage={jest.fn()} />)

    const amount = screen.getByText(/800/)
    expect(amount).toHaveClass('text-destructive')
  })

  it('shows the empty state when there are no events', () => {
    wrap(<ForecastEventsPreview events={[]} onManage={jest.fn()} />)

    expect(screen.getByText('No life events yet')).toBeInTheDocument()
  })
})
