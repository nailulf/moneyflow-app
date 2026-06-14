import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }))
import { TransactionTypeTabs } from '@/components/features/transaction/TransactionTypeTabs'

describe('TransactionTypeTabs', () => {
  it('renders four segments as aria-pressed buttons and fires onValueChange', () => {
    const onValueChange = jest.fn()
    render(<TransactionTypeTabs value="ALL" onValueChange={onValueChange} />)
    expect(screen.getByRole('button', { name: 'all' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'expense' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'income' }))
    expect(onValueChange).toHaveBeenCalledWith('INCOME')
  })
})
