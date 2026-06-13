import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }))

import { YearlyCategorySelector } from '@/components/features/budget/YearlyCategorySelector'

const categories = [
  { id: 'c1', name: 'Holiday Travel' },
  { id: 'c2', name: 'Insurance' },
  { id: 'c3', name: 'Electronics' },
]

describe('YearlyCategorySelector', () => {
  it('renders every category with the right checked state', () => {
    render(
      <YearlyCategorySelector
        categories={categories}
        selected={new Map([['c1', 5_000_000]])}
        currency="IDR"
        onToggle={() => {}}
        onAmountChange={() => {}}
      />
    )
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(3)
    expect(boxes[0]).toHaveAttribute('aria-checked', 'true')
    expect(boxes[1]).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Holiday Travel')).toBeInTheDocument()
    expect(screen.getByText('Electronics')).toBeInTheDocument()
  })

  it('toggles a category when its checkbox is clicked', () => {
    const onToggle = jest.fn()
    render(
      <YearlyCategorySelector
        categories={categories}
        selected={new Map()}
        currency="IDR"
        onToggle={onToggle}
        onAmountChange={() => {}}
      />
    )
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    expect(onToggle).toHaveBeenCalledWith({ id: 'c2', name: 'Insurance' })
  })

  it('edits the amount of a selected category via its pill', () => {
    const onAmountChange = jest.fn()
    render(
      <YearlyCategorySelector
        categories={categories}
        selected={new Map([['c1', 5_000_000]])}
        currency="IDR"
        onToggle={() => {}}
        onAmountChange={onAmountChange}
      />
    )
    // The selected row shows a pill button; clicking it reveals the input.
    fireEvent.click(screen.getByRole('button', { name: /5/ }))
    const input = screen.getByRole('spinbutton', { name: 'Holiday Travel' }) as HTMLInputElement
    fireEvent.change(input, { target: { value: '6000000' } })
    expect(onAmountChange).toHaveBeenCalledWith('c1', 6000000)
  })

  it('clamps negative amounts to zero', () => {
    const onAmountChange = jest.fn()
    render(
      <YearlyCategorySelector
        categories={categories}
        selected={new Map([['c1', 5_000_000]])}
        currency="IDR"
        onToggle={() => {}}
        onAmountChange={onAmountChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /5/ }))
    const input = screen.getByRole('spinbutton', { name: 'Holiday Travel' }) as HTMLInputElement
    fireEvent.change(input, { target: { value: '-5' } })
    expect(onAmountChange).toHaveBeenCalledWith('c1', 0)
  })
})
