import { isFullScreenFlow } from '@/lib/nav-visibility'

describe('goal detail nav visibility', () => {
  it('hides bottom nav on a goal detail route', () => {
    expect(isFullScreenFlow('/goals/abc')).toBe(true)
  })
  it('does NOT hide on the goals list', () => {
    expect(isFullScreenFlow('/goals')).toBe(false)
  })
})
