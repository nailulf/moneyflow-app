import { isFullScreenFlow } from '@/lib/nav-visibility'

describe('isFullScreenFlow', () => {
  it.each(['/accounts/new', '/accounts/new/bank', '/budget/create', '/budget/create?period=yearly', '/budget/edit'])(
    'hides chrome on %s', (path) => expect(isFullScreenFlow(path)).toBe(true)
  )
  it.each(['/', '/accounts', '/budget', '/transactions', '/portfolio'])(
    'keeps chrome on %s', (path) => expect(isFullScreenFlow(path)).toBe(false)
  )
  it.each(['/portfolio/abc-123', '/portfolio/abc-123/add'])(
    'hides chrome on portfolio drill-in %s', (path) => expect(isFullScreenFlow(path)).toBe(true)
  )
  it.each(['/portfolio', '/portfolio/holdings', '/portfolio/analytics'])(
    'keeps chrome on portfolio root and desktop sub-pages %s', (path) => expect(isFullScreenFlow(path)).toBe(false)
  )
})
