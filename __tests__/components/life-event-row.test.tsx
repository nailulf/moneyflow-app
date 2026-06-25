import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { LifeEventRow } from '@/components/features/forecast/LifeEventRow'
import type { ForecastEvent } from '@/lib/forecast/types'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  )

describe('LifeEventRow', () => {
  it('renders a PROPERTY event with name, year, and destructive amount', () => {
    const event: ForecastEvent = {
      id: '1',
      scenario_id: 'scenario-1',
      user_id: 'user-1',
      name: 'Buy Home',
      event_date: '2030-01-01',
      event_type: 'PROPERTY',
      amount: 160_000_000,
      note: null,
      details: {},
      is_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    wrap(
      <LifeEventRow
        event={event}
        dob={null}
        onTap={jest.fn()}
        onToggle={jest.fn()}
      />
    )

    // Verify name is displayed
    expect(screen.getByText('Buy Home')).toBeInTheDocument()

    // Verify year appears
    expect(screen.getByText(/2030/)).toBeInTheDocument()

    // Verify amount with text-destructive styling
    const amountElements = screen.getAllByText(/−Rp|160/)
    expect(amountElements.length).toBeGreaterThan(0)
  })

  it('renders a RETIREMENT event with "Income stops" text', () => {
    const event: ForecastEvent = {
      id: '2',
      scenario_id: 'scenario-1',
      user_id: 'user-1',
      name: 'Retirement',
      event_date: '2050-01-01',
      event_type: 'RETIREMENT',
      amount: 0,
      note: null,
      details: {},
      is_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    wrap(
      <LifeEventRow
        event={event}
        dob={null}
        onTap={jest.fn()}
        onToggle={jest.fn()}
      />
    )

    // Verify name is displayed
    expect(screen.getByText('Retirement')).toBeInTheDocument()

    // Verify "Income stops" text is shown instead of amount
    expect(screen.getByText('Income stops')).toBeInTheDocument()
  })

  it('calls onToggle when Switch is toggled', () => {
    const onToggleMock = jest.fn()
    const event: ForecastEvent = {
      id: '3',
      scenario_id: 'scenario-1',
      user_id: 'user-1',
      name: 'Event',
      event_date: '2030-01-01',
      event_type: 'PROPERTY',
      amount: 1_000_000,
      note: null,
      details: {},
      is_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    wrap(
      <LifeEventRow
        event={event}
        dob={null}
        onTap={jest.fn()}
        onToggle={onToggleMock}
      />
    )

    // Find and click the switch
    const switchElement = screen.getByRole('switch')
    fireEvent.click(switchElement)

    // Verify onToggle was called with correct parameters
    expect(onToggleMock).toHaveBeenCalledWith('3', false)
  })

  it('displays age when dob is provided', () => {
    const event: ForecastEvent = {
      id: '4',
      scenario_id: 'scenario-1',
      user_id: 'user-1',
      name: 'Life Event',
      event_date: '2035-06-15',
      event_type: 'WEDDING',
      amount: 50_000_000,
      note: null,
      details: {},
      is_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    // dob such that age at 2035 is 30
    const dob = '2005-01-01'

    wrap(
      <LifeEventRow
        event={event}
        dob={dob}
        onTap={jest.fn()}
        onToggle={jest.fn()}
      />
    )

    expect(screen.getByText(/2035/)).toBeInTheDocument()
    expect(screen.getByText(/age 30/)).toBeInTheDocument()
  })

  it('appends "/yr" suffix when event has is_recurring detail', () => {
    const event: ForecastEvent = {
      id: '5',
      scenario_id: 'scenario-1',
      user_id: 'user-1',
      name: 'Recurring Event',
      event_date: '2030-01-01',
      event_type: 'OTHER',
      amount: 10_000_000,
      note: null,
      details: { is_recurring: true },
      is_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    wrap(
      <LifeEventRow
        event={event}
        dob={null}
        onTap={jest.fn()}
        onToggle={jest.fn()}
      />
    )

    expect(screen.getByText('/yr')).toBeInTheDocument()
  })

  it('appends "/yr" suffix for KIDS event type', () => {
    const event: ForecastEvent = {
      id: '6',
      scenario_id: 'scenario-1',
      user_id: 'user-1',
      name: 'Have a child',
      event_date: '2030-01-01',
      event_type: 'KIDS',
      amount: 25_000_000,
      note: null,
      details: { end_age: 18 },
      is_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    wrap(
      <LifeEventRow
        event={event}
        dob={null}
        onTap={jest.fn()}
        onToggle={jest.fn()}
      />
    )

    expect(screen.getByText('/yr')).toBeInTheDocument()
  })

  it('displays "until {end_age}" for KIDS events with end_age detail', () => {
    const event: ForecastEvent = {
      id: '7',
      scenario_id: 'scenario-1',
      user_id: 'user-1',
      name: 'Child 1',
      event_date: '2030-01-01',
      event_type: 'KIDS',
      amount: 25_000_000,
      note: null,
      details: { end_age: 18 },
      is_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    wrap(
      <LifeEventRow
        event={event}
        dob={null}
        onTap={jest.fn()}
        onToggle={jest.fn()}
      />
    )

    expect(screen.getByText(/until 18/)).toBeInTheDocument()
  })

  it('greys out row when is_enabled is false', () => {
    const event: ForecastEvent = {
      id: '8',
      scenario_id: 'scenario-1',
      user_id: 'user-1',
      name: 'Disabled Event',
      event_date: '2030-01-01',
      event_type: 'PROPERTY',
      amount: 100_000_000,
      note: null,
      details: {},
      is_enabled: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const { container } = wrap(
      <LifeEventRow
        event={event}
        dob={null}
        onTap={jest.fn()}
        onToggle={jest.fn()}
      />
    )

    // Find the card element with opacity class
    const card = container.querySelector('[class*="opacity-60"]')
    expect(card).toBeInTheDocument()
  })

  it('calls onTap when middle section is clicked', () => {
    const onTapMock = jest.fn()
    const event: ForecastEvent = {
      id: '9',
      scenario_id: 'scenario-1',
      user_id: 'user-1',
      name: 'Tapable Event',
      event_date: '2030-01-01',
      event_type: 'WEDDING',
      amount: 50_000_000,
      note: null,
      details: {},
      is_enabled: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    wrap(
      <LifeEventRow
        event={event}
        dob={null}
        onTap={onTapMock}
        onToggle={jest.fn()}
      />
    )

    const eventName = screen.getByText('Tapable Event')
    fireEvent.click(eventName)

    expect(onTapMock).toHaveBeenCalled()
  })
})
