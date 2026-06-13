import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }))

import { LockedCategoriesNotice } from '@/components/features/budget/LockedCategoriesNotice'

describe('LockedCategoriesNotice', () => {
  it('renders the banner, title, and each locked category name', () => {
    render(<LockedCategoriesNotice categories={[{ id: 'c1', name: 'Food & Dining' }, { id: 'c2', name: 'Transport' }]} />)
    expect(screen.getByText('lockedBanner')).toBeInTheDocument()
    expect(screen.getByText('lockedTitle')).toBeInTheDocument()
    expect(screen.getByText('Food & Dining')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
  })
  it('renders nothing when there are no locked categories', () => {
    const { container } = render(<LockedCategoriesNotice categories={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
