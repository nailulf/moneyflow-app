import { isFullScreenFlow } from '@/lib/nav-visibility'

describe('account detail nav visibility', () => {
  it('hides bottom nav on an account detail route', () => {
    expect(isFullScreenFlow('/accounts/abc-123')).toBe(true)
  })
  it('does NOT hide on the accounts list', () => {
    expect(isFullScreenFlow('/accounts')).toBe(false)
  })
  it('still hides on /accounts/new', () => {
    expect(isFullScreenFlow('/accounts/new')).toBe(true)
  })
})
