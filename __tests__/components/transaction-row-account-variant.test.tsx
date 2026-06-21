import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TransactionRow } from '@/components/features/transaction/TransactionRow'

const tx = { id: '1', type: 'EXPENSE', amount: -28000, merchant: 'Kopi Kenangan', currency: 'IDR' } as any

it('account-context variant shows category as subtitle and hides the account pill', () => {
  render(
    <TransactionRow transaction={tx} categoryName="Food & Drink" accountName="BCA" hideAccount onSelect={() => {}} />,
  )
  expect(screen.getByText('Kopi Kenangan')).toBeInTheDocument()
  expect(screen.getByText('Food & Drink')).toBeInTheDocument()
  expect(screen.queryByText('BCA')).not.toBeInTheDocument()
})

it('default variant still shows the account pill', () => {
  render(
    <TransactionRow transaction={tx} categoryName="Food & Drink" accountName="BCA" onSelect={() => {}} />,
  )
  expect(screen.getByText('BCA')).toBeInTheDocument()
})
