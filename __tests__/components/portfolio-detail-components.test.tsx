import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

global.ResizeObserver = global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k)
    return t
  },
}))

import { HoldingsByClassList } from '@/components/features/portfolio/HoldingsByClassList'
import { AssetClassSelectCards } from '@/components/features/portfolio/AssetClassSelectCards'
import { HoldingManageSheet } from '@/components/features/portfolio/HoldingManageSheet'

const holding = (over = {}) => ({
  id: 'h1', account_id: 'a1', user_id: 'u', asset_class: 'IDX_STOCK', symbol: 'BBCA',
  name: 'Bank Central Asia', quantity: 200, purchase_price: 9000, current_value: 1900000,
  purchase_date: '2026-06-01', currency: 'IDR', created_at: '', updated_at: '', ...over,
})

describe('HoldingsByClassList', () => {
  it('groups by class, renders names/values and fires onSelect', () => {
    const onSelect = jest.fn()
    render(<HoldingsByClassList holdings={[holding(), holding({ id: 'h2', asset_class: 'MUTUAL_FUND', name: 'Bibit', current_value: 500000 })] as never} onSelect={onSelect} />)
    expect(screen.getByText('class.IDX_STOCK')).toBeInTheDocument()
    expect(screen.getByText('class.MUTUAL_FUND')).toBeInTheDocument()
    expect(screen.getByText('Bank Central Asia')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Bank Central Asia/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1' }))
  })
})

describe('AssetClassSelectCards', () => {
  it('renders the six class cards and fires onSelect with the class', () => {
    const onSelect = jest.fn()
    render(<AssetClassSelectCards onSelect={onSelect} />)
    expect(screen.getByRole('button', { name: /class\.IDX_STOCK/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /class\.BOND/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /class\.US_STOCK/ }))
    expect(onSelect).toHaveBeenCalledWith('US_STOCK')
  })
})

describe('HoldingManageSheet', () => {
  it('shows the holding summary and fires onDelete after confirm', () => {
    const onDelete = jest.fn()
    render(<HoldingManageSheet open holding={holding() as never} pending={false} onClose={() => {}} onSave={() => {}} onDelete={onDelete} />)
    expect(screen.getByText('Bank Central Asia')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'manage.remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'manage.confirmRemove' }))
    expect(onDelete).toHaveBeenCalled()
  })
  it('edits the current value and fires onSave with the patch', () => {
    const onSave = jest.fn()
    render(<HoldingManageSheet open holding={holding() as never} pending={false} onClose={() => {}} onSave={onSave} onDelete={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'manage.edit' }))
    fireEvent.change(screen.getByLabelText('manage.currentValue'), { target: { value: '2100000' } })
    fireEvent.click(screen.getByRole('button', { name: 'manage.save' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ current_value: 2100000 }))
  })
})
