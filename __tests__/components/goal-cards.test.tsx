import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: any) => (v?.pct ?? k), useLocale: () => 'en' }))
import { GoalCardCompact } from '@/components/features/goals/GoalCardCompact'
import { GoalCardMini } from '@/components/features/goals/GoalCardMini'

const item = {
  goal: { id: 'g1', account_id: 'a', name: 'Dana Darurat', goal_type: 'emergency_fund', target_amount: 30000000, target_date: '2026-12-31', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } as any,
  saved: 15370000, isCompleted: false,
}

it('renders name, saved/target and percent', () => {
  render(<GoalCardCompact item={item} currency="IDR" />)
  expect(screen.getByText('Dana Darurat')).toBeInTheDocument()
  expect(screen.getByText(/15,37|15\.37|15,4|15\.4/)).toBeInTheDocument() // compact saved
  expect(screen.getByText(/51/)).toBeInTheDocument() // 15.37M/30M ≈ 51%
})

it('renders the mini variant with name and percent', () => {
  render(<GoalCardMini item={item} currency="IDR" />)
  expect(screen.getByText('Dana Darurat')).toBeInTheDocument()
  expect(screen.getByText(/51/)).toBeInTheDocument()
})

it('renders the mini variant target-date meta line (design O3m7TF)', () => {
  render(<GoalCardMini item={item} currency="IDR" />)
  expect(screen.getByText('Dec 2026')).toBeInTheDocument()
})
