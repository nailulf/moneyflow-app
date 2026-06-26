import type { ReactNode } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import en from '@/messages/en.json'

global.ResizeObserver =
  global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const back = jest.fn()
const replace = jest.fn()

const updateMutate = jest.fn().mockResolvedValue({})
const deleteMutate = jest.fn().mockResolvedValue({})

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ev1' }),
  useRouter: () => ({ back, replace }),
}))

jest.mock('@/hooks/useForecastQuery', () => ({
  useForecastScenarios: () => ({ data: [{ id: 's1', is_default: true }] }),
  useForecastEvents: () => ({
    data: [
      {
        id: 'ev1',
        scenario_id: 's1',
        name: 'My event',
        event_type: 'OTHER',
        event_date: '2030-01-01',
        amount: 1000,
        details: { total_cost: 1000, is_recurring: false, recurring_years: 1 },
        is_enabled: true,
        note: null,
      },
    ],
  }),
  useUpdateEvent: () => ({ mutateAsync: updateMutate, isPending: false }),
  useDeleteEvent: () => ({ mutateAsync: deleteMutate }),
  useForecastUserDOB: () => ({ data: null }),
}))

import EditEventPage from '@/app/forecast/events/[id]/page'

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  )
}

describe('EditEventPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the form with the loaded event name', () => {
    render(<EditEventPage />, { wrapper: Wrapper })
    expect(screen.getByDisplayValue('My event')).toBeInTheDocument()
  })

  it('updates the event on Save event', async () => {
    render(<EditEventPage />, { wrapper: Wrapper })
    fireEvent.click(screen.getByText('Save event'))
    await waitFor(() =>
      expect(updateMutate).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'ev1' })),
    )
  })

  it('deletes the event on Delete event', async () => {
    render(<EditEventPage />, { wrapper: Wrapper })
    fireEvent.click(screen.getByText('Delete event'))
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('ev1'))
  })
})
