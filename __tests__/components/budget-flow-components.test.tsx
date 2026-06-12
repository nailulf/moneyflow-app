import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

global.ResizeObserver = global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    return t
  },
}))

import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { BudgetAmountsEditor } from '@/components/features/budget/BudgetAmountsEditor'
import { BudgetPreviewCard } from '@/components/features/budget/BudgetPreviewCard'
import { ConfirmChangesSheet } from '@/components/features/budget/ConfirmChangesSheet'
import { StartFromCards } from '@/components/features/budget/StartFromCards'

describe('CreateFlowHeader stepLabel', () => {
  it('renders the step counter when given', () => {
    render(<CreateFlowHeader title="Create Budget" onBack={() => {}} backLabel="Back" stepLabel="1 of 4" />)
    expect(screen.getByText('1 of 4')).toBeInTheDocument()
  })
})

describe('BudgetAmountsEditor', () => {
  const rows = [
    { category_id: 'c1', category_name: 'Food & Dining', category_color: '#a', allocated_amount: 1_500_000 },
  ]
  it('renders rows with amount inputs and fires onAmountChange', () => {
    const onAmountChange = jest.fn()
    render(
      <BudgetAmountsEditor
        rows={rows}
        suggestions={new Map([['c1', 575_000]])}
        suggestionsOn
        onToggleSuggestions={() => {}}
        onAmountChange={onAmountChange}
        onRemove={() => {}}
        onAddCategory={() => {}}
        totalAllocated={1_500_000}
        currency="IDR"
      />
    )
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    expect(screen.getByText(/amounts\.suggested:/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Food & Dining'), { target: { value: '1600000' } })
    expect(onAmountChange).toHaveBeenCalledWith('c1', 1_600_000)
    expect(screen.getByText(/amounts\.total/)).toBeInTheDocument()
  })
})

describe('BudgetPreviewCard', () => {
  it('renders total, income trio, and category percentage rows', () => {
    render(
      <BudgetPreviewCard
        periodLabel="June 2026 · Monthly Budget"
        total={8_500_000}
        income={12_500_000}
        currency="IDR"
        rows={[{ categoryId: 'c1', name: 'Food & Dining', amount: 2_600_000, pct: 31 }] as never}
      />
    )
    expect(screen.getByText(/8\.500\.000/)).toBeInTheDocument()
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    expect(screen.getByText(/preview\.ofIncome:/)).toBeInTheDocument()
  })
})

describe('ConfirmChangesSheet', () => {
  const diff = [{ categoryId: 'c1', name: 'Food & Dining', from: 1_500_000, to: 1_800_000 }]
  it('lists deltas and fires apply/cancel', () => {
    const onApply = jest.fn()
    const onCancel = jest.fn()
    render(<ConfirmChangesSheet open diff={diff} currency="IDR" pending={false} onApply={onApply} onCancel={onCancel} />)
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'confirm.apply' }))
    expect(onApply).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'confirm.cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('StartFromCards', () => {
  it('renders the three options, disables copy when unavailable, fires onChange', () => {
    const onChange = jest.fn()
    render(<StartFromCards value="scratch" onChange={onChange} copyAvailable={false} copyHint="May 2026" />)
    const copy = screen.getByRole('button', { name: /startFrom\.copy/ })
    expect(copy).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /startFrom\.template/ }))
    expect(onChange).toHaveBeenCalledWith('template')
  })
})
