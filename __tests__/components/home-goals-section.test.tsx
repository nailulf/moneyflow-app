import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
  useLocale: () => 'en',
}))

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// Stub the heavy sheet — it pulls in RHF/zod/account context.
jest.mock('@/components/features/goals/AddGoalSheet', () => ({
  AddGoalSheet: () => null,
}))

const useAllGoals = jest.fn()
jest.mock('@/hooks/useGoalsQuery', () => ({
  useAllGoals: () => useAllGoals(),
}))

import { HomeGoalsSection } from '@/components/features/goals/HomeGoalsSection'

function makeItem(id: string, name: string) {
  return {
    goal: {
      id,
      name,
      goal_type: 'emergency_fund',
      target_amount: 50000000,
      target_date: '2030-01-31',
      created_at: '2025-01-01',
    },
    saved: 25000000,
    isCompleted: false,
    account: { id: `acc-${id}`, currency: 'IDR' },
  }
}

describe('HomeGoalsSection', () => {
  beforeEach(() => {
    push.mockClear()
  })

  it('renders the section title, a "See all" control, an add control and each goal name', () => {
    useAllGoals.mockReturnValue({
      data: {
        items: [makeItem('g1', 'Emergency Fund'), makeItem('g2', 'Vacation')],
        totalSaved: 0,
        totalTarget: 0,
        activeCount: 2,
      },
    })

    render(<HomeGoalsSection />)

    expect(screen.getByText('sectionTitle')).toBeInTheDocument()
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
    expect(screen.getByText('Vacation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seeAll/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/ })).toBeInTheDocument()
  })

  it('still renders an add control when there are no goals', () => {
    useAllGoals.mockReturnValue({ data: { items: [], totalSaved: 0, totalTarget: 0, activeCount: 0 } })

    render(<HomeGoalsSection />)

    expect(screen.getByRole('button', { name: /add/ })).toBeInTheDocument()
  })
})
