import { render, screen, fireEvent } from '@testing-library/react'
import { AmountKeypad } from '@/components/features/transaction/form/AmountKeypad'

it('emits digit, thousands, and backspace actions', () => {
  const onKey = jest.fn()
  render(<AmountKeypad onKey={onKey} />)
  fireEvent.click(screen.getByRole('button', { name: '7' }))
  fireEvent.click(screen.getByRole('button', { name: '000' }))
  fireEvent.click(screen.getByRole('button', { name: /backspace/i }))
  expect(onKey).toHaveBeenNthCalledWith(1, { type: 'appendDigit', digit: '7' })
  expect(onKey).toHaveBeenNthCalledWith(2, { type: 'appendThousands' })
  expect(onKey).toHaveBeenNthCalledWith(3, { type: 'backspace' })
})
