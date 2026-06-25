import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { MobileEventForm } from '@/components/features/forecast/MobileEventForm'
import type { ForecastEvent } from '@/lib/forecast/types'
import en from '@/messages/en.json'

// @radix-ui/react-switch uses ResizeObserver internally; jsdom doesn't provide it.
global.ResizeObserver =
  global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const wrap = (ui: React.ReactNode) =>
  render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

describe('MobileEventForm', () => {
  it('PROPERTY create: builds payload and calls onSubmit', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    const onBack = jest.fn()

    wrap(
      <MobileEventForm
        eventType="PROPERTY"
        scenarioId="s1"
        onSubmit={onSubmit}
        onBack={onBack}
      />
    )

    fireEvent.change(screen.getByTestId('event-name'), { target: { value: 'New house' } })
    fireEvent.change(screen.getByTestId('event-year'), { target: { value: '2030' } })
    fireEvent.change(screen.getByTestId('event-home-price'), { target: { value: '1.000.000.000' } })
    // loan + downPayment 20 + interest 6.5 are the defaults

    fireEvent.click(screen.getByRole('button', { name: 'Save event' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        scenario_id: 's1',
        event_type: 'PROPERTY',
        amount: expect.any(Number),
        details: expect.objectContaining({
          home_price: 1_000_000_000,
          interest_rate: 0.065,
          payment_type: 'loan',
        }),
      })
    )
  })

  it('OTHER edit: shows recurring state, calls onUpdate and onDelete', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    const onUpdate = jest.fn().mockResolvedValue(undefined)
    const onDelete = jest.fn().mockResolvedValue(undefined)
    const onBack = jest.fn()

    const existingEvent = {
      id: 'e1',
      name: 'My event',
      event_type: 'OTHER',
      event_date: '2028-01-01',
      amount: 1000,
      details: { total_cost: 1000, is_recurring: true, recurring_years: 3 },
    } as unknown as ForecastEvent

    wrap(
      <MobileEventForm
        eventType="OTHER"
        scenarioId="s1"
        existingEvent={existingEvent}
        onSubmit={onSubmit}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onBack={onBack}
      />
    )

    // recurring switch is on
    expect(screen.getByRole('switch')).toBeChecked()
    // recurring-years shows 3
    expect(screen.getByTestId('event-recurring-years')).toHaveValue(3)

    fireEvent.click(screen.getByRole('button', { name: 'Save event' }))
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(onUpdate).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({
        details: expect.objectContaining({ recurring_years: 3 }),
      })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete event' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('e1'))
  })
})
