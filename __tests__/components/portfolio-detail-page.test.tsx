import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

global.ResizeObserver = global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn(), replace: jest.fn() }),
  useParams: () => ({ accountId: 'acc1' }),
}))
jest.mock('next-intl', () => ({
  useTranslations: () => { const t = (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k); return t },
}))
jest.mock('@/contexts/AccountContext', () => ({
  useAccounts: () => ({ accounts: [{ id: 'acc1', name: 'Stockbit — Growth', type: 'INVESTMENT', broker: 'Stockbit', currency: 'IDR', balance: 1900000 }], loading: false }),
}))
const deleteHolding = jest.fn().mockResolvedValue(undefined)
const updateHolding = jest.fn().mockResolvedValue({})
jest.mock('@/lib/api/holdings', () => ({
  deleteHolding: (...a: unknown[]) => deleteHolding(...a),
  updateHolding: (...a: unknown[]) => updateHolding(...a),
}))
const invalidate = jest.fn()
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidate }),
}))
const holdingsData = { data: [{ id: 'h1', account_id: 'acc1', user_id: 'u', asset_class: 'IDX_STOCK', symbol: 'BBCA', name: 'Bank Central Asia', quantity: 200, purchase_price: 9000, current_value: 1900000, purchase_date: null, currency: 'IDR', created_at: '', updated_at: '' }], isLoading: false }
jest.mock('@/hooks/useHoldings', () => ({ useHoldings: () => holdingsData }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import AccountDetailPage from '@/app/portfolio/[accountId]/page'

describe('AccountDetailPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders account name, value hero, holdings, and routes Add Asset', () => {
    render(<AccountDetailPage />)
    expect(screen.getByRole('heading', { name: 'Stockbit — Growth' })).toBeInTheDocument()
    expect(screen.getByText('Bank Central Asia')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /detail\.addAsset/ }))
    expect(push).toHaveBeenCalledWith('/portfolio/acc1/add')
  })

  it('opens the manage sheet on a holding tap and deletes', async () => {
    render(<AccountDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: /Bank Central Asia/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'manage.remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'manage.confirmRemove' }))
    await waitFor(() => expect(deleteHolding).toHaveBeenCalledWith('acc1', 'h1'))
    expect(invalidate).toHaveBeenCalled()
  })
})
