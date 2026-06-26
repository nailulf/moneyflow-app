import type { ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import en from '@/messages/en.json'

global.ResizeObserver =
  global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const push = jest.fn()
const back = jest.fn()
const replace = jest.fn()

let typeParam: string | null = null

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back, replace }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'scenario') return 's1'
      if (key === 'type') return typeParam
      return null
    },
  }),
}))

jest.mock('@/hooks/useForecastQuery', () => ({
  useCreateEvent: () => ({ mutateAsync: jest.fn().mockResolvedValue({}), isPending: false }),
  useForecastUserDOB: () => ({ data: null }),
}))

import NewEventPage from '@/app/forecast/events/new/page'

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  )
}

describe('NewEventPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    typeParam = null
  })

  it('shows Step A category grid, then advances to Step B on tile click', () => {
    render(<NewEventPage />, { wrapper: Wrapper })

    // Step A: category template label visible
    expect(screen.getByText('Buy a home')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Buy a home'))

    // Step B: MobileEventForm shown
    expect(screen.getByText('Save event')).toBeInTheDocument()
  })

  it('skips Step A when ?type is preset', () => {
    typeParam = 'OTHER'
    render(<NewEventPage />, { wrapper: Wrapper })

    expect(screen.getByText('Save event')).toBeInTheDocument()
    expect(screen.queryByText('Buy a home')).not.toBeInTheDocument()
  })
})
