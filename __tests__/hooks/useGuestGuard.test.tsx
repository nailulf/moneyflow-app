import { renderHook, act } from '@testing-library/react'
const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
let mockUser: { is_anonymous?: boolean } | null = null
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }))
import { useGuestGuard } from '@/hooks/useGuestGuard'

describe('useGuestGuard', () => {
  beforeEach(() => { push.mockClear() })

  it('runs the action for a permanent user', () => {
    mockUser = { is_anonymous: false }
    const fn = jest.fn()
    const { result } = renderHook(() => useGuestGuard())
    act(() => result.current.guard(fn))
    expect(fn).toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('routes anonymous users to the signup wall instead of running the action', () => {
    mockUser = { is_anonymous: true }
    const fn = jest.fn()
    const { result } = renderHook(() => useGuestGuard())
    act(() => result.current.guard(fn))
    expect(fn).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/start/save')
  })
})
