import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryPickerSheet } from '@/components/features/transaction/form/CategoryPickerSheet'

const cats = [
  { id: 'c1', name: 'Coffee', group_type: 'EXPENSE' },
  { id: 'c2', name: 'Salary', group_type: 'INCOME' },
  { id: 'c3', name: 'Food', group_type: 'EXPENSE' },
]

it('lists only the active type categories and emits selection', () => {
  const onSelect = jest.fn()
  render(<CategoryPickerSheet open type="EXPENSE" categories={cats as any} selectedId={null} onSelect={onSelect} onOpenChange={jest.fn()} />)
  expect(screen.getByText('Coffee')).toBeInTheDocument()
  expect(screen.getByText('Food')).toBeInTheDocument()
  expect(screen.queryByText('Salary')).toBeNull() // income filtered out
  fireEvent.click(screen.getByText('Coffee'))
  expect(onSelect).toHaveBeenCalledWith('c1')
})

it('search filters tiles', () => {
  render(<CategoryPickerSheet open type="EXPENSE" categories={cats as any} selectedId={null} onSelect={jest.fn()} onOpenChange={jest.fn()} />)
  fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'food' } })
  expect(screen.queryByText('Coffee')).toBeNull()
  expect(screen.getByText('Food')).toBeInTheDocument()
})
