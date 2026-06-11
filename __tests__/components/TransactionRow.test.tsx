import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }))
import { TransactionRow } from '@/components/features/transaction/TransactionRow'

const base = { categoryName: 'Food', categoryColor: 'hsl(var(--chart-1))', accountName: 'BCA', onSelect: () => {} }

describe('TransactionRow', () => {
  it('shows merchant, account, and an expense amount in destructive color', () => {
    render(<TransactionRow transaction={{ id: '1', type: 'EXPENSE', amount: -32000, merchant: 'Kopi Kenangan', description: '', currency: 'IDR' } as any} {...base} />)
    expect(screen.getByText('Kopi Kenangan')).toBeInTheDocument()
    expect(screen.getByText('BCA')).toBeInTheDocument()
    const amount = screen.getByText(/32.000/)
    expect(amount.className).toMatch(/text-destructive/)
    expect(amount.textContent).toMatch(/^-/)
  })
  it('shows income amount in success color with a + sign', () => {
    render(<TransactionRow transaction={{ id: '2', type: 'INCOME', amount: 2500000, merchant: 'Freelance', description: '', currency: 'IDR' } as any} {...base} />)
    const amount = screen.getByText(/2.500.000/)
    expect(amount.className).toMatch(/text-success/)
    expect(amount.textContent).toMatch(/^\+/)
  })
  it('falls back to description when merchant is missing', () => {
    render(<TransactionRow transaction={{ id: '3', type: 'EXPENSE', amount: -1, merchant: null, description: 'Indomaret', currency: 'IDR' } as any} {...base} />)
    expect(screen.getByText('Indomaret')).toBeInTheDocument()
  })
})
