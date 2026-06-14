import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn(), replace: jest.fn() }),
  useParams: () => ({ accountId: 'acc1' }),
}))
jest.mock('next-intl', () => ({
  useTranslations: () => { const t = (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k); return t },
}))
const createHolding = jest.fn().mockResolvedValue({ id: 'h9' })
jest.mock('@/lib/api/holdings', () => ({ createHolding: (...a: unknown[]) => createHolding(...a) }))
const invalidate = jest.fn()
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: invalidate }) }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import AddAssetPage from '@/app/portfolio/[accountId]/add/page'

describe('AddAssetPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('selects a class, fills details, and creates the holding with lots→shares', async () => {
    render(<AddAssetPage />)
    // step 1 — class select (AssetClassSelectCards uses useTranslations('portfolio'), t('class.IDX_STOCK') → 'class.IDX_STOCK')
    fireEvent.click(screen.getByRole('button', { name: /class\.IDX_STOCK/ }))
    // step 2 — details (page uses useTranslations('holdingCreate'), t('nameLabel') → 'nameLabel')
    fireEvent.change(await screen.findByLabelText('nameLabel'), { target: { value: 'Bank Central Asia' } })
    fireEvent.change(screen.getByLabelText('lotsLabel'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('priceLabel'), { target: { value: '9500' } })
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    await waitFor(() => expect(createHolding).toHaveBeenCalled())
    expect(createHolding.mock.calls[0][0]).toBe('acc1')
    expect(createHolding.mock.calls[0][1]).toMatchObject({ asset_class: 'IDX_STOCK', quantity: 200, current_value: 1900000 })
    expect(push).toHaveBeenCalledWith('/portfolio/acc1')
  })

  it('shows the name error and does not submit when empty', async () => {
    render(<AddAssetPage />)
    fireEvent.click(screen.getByRole('button', { name: /class\.US_STOCK/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'submit' }))
    expect(await screen.findByText('errors.nameRequired')).toBeInTheDocument()
    expect(createHolding).not.toHaveBeenCalled()
  })
})
