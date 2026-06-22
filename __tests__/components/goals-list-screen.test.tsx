import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
  useLocale: () => 'id',
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

import { GoalsListScreen } from '@/components/features/goals/GoalsListScreen'

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

describe('GoalsListScreen', () => {
  beforeEach(() => {
    push.mockClear()
  })

  it('renders the hero total and each goal name', () => {
    useAllGoals.mockReturnValue({
      data: {
        items: [makeItem('g1', 'Emergency Fund'), makeItem('g2', 'Vacation')],
        totalSaved: 50000000,
        totalTarget: 100000000,
        activeCount: 2,
      },
    })

    render(<GoalsListScreen />)

    // Hero title + formatted total (Rp 50.000.000)
    expect(screen.getByText('list.totalTitle')).toBeInTheDocument()
    expect(screen.getByText(/50\.000\.000/)).toBeInTheDocument()

    // Both goal names render
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
    expect(screen.getByText('Vacation')).toBeInTheDocument()
  })

  it('renders an empty state when there are no goals', () => {
    useAllGoals.mockReturnValue({
      data: { items: [], totalSaved: 0, totalTarget: 0, activeCount: 0 },
    })

    render(<GoalsListScreen />)

    expect(screen.getByText('list.empty')).toBeInTheDocument()
  })
})
