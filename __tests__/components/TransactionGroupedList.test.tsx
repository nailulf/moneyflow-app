import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k, useLocale: () => 'en' }))
import { TransactionGroupedList } from '@/components/features/transaction/TransactionGroupedList'

const props = {
  todayKey: '2025-06-07',
  getCategoryName: () => 'Food',
  getCategoryColor: () => 'hsl(var(--chart-1))',
  getAccountName: () => 'BCA',
  onSelect: () => {},
  isLoading: false,
}

describe('TransactionGroupedList', () => {
  it('renders a Today header and the transactions in it', () => {
    const groups = [{ dateKey: '2025-06-07', items: [{ id: '1', type: 'EXPENSE', amount: -32000, merchant: 'Kopi Kenangan', currency: 'IDR' } as any] }]
    render(<TransactionGroupedList groups={groups} {...props} />)
    expect(screen.getByText('today')).toBeInTheDocument()
    expect(screen.getByText('Kopi Kenangan')).toBeInTheDocument()
  })
  it('renders an empty state when there are no groups', () => {
    render(<TransactionGroupedList groups={[]} {...props} />)
    expect(screen.getByText('empty')).toBeInTheDocument()
  })
})
