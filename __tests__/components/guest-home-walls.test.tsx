import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
  useRouter: () => ({ push }),
}))
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

// useGuestGuard reads the current user from AuthContext to decide guest vs permanent.
let mockUser: { is_anonymous?: boolean } | null = null
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }))

import { MobileBottomNav } from '@/components/features/navigation/MobileBottomNav'

describe('guest signup walls — bottom-nav add FAB', () => {
  beforeEach(() => { push.mockClear() })

  it('routes a guest (anonymous) to /start/save instead of /transactions/new', () => {
    mockUser = { is_anonymous: true }
    render(<MobileBottomNav />)
    fireEvent.click(screen.getByTestId('bottom-nav-add-fab'))
    expect(push).toHaveBeenCalledWith('/start/save')
    expect(push).not.toHaveBeenCalledWith('/transactions/new')
  })

  it('routes a permanent user to /transactions/new', () => {
    mockUser = { is_anonymous: false }
    render(<MobileBottomNav />)
    fireEvent.click(screen.getByTestId('bottom-nav-add-fab'))
    expect(push).toHaveBeenCalledWith('/transactions/new')
    expect(push).not.toHaveBeenCalledWith('/start/save')
  })
})
