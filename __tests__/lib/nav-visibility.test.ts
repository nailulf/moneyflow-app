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
  it('hides nav on the add/edit transaction routes but NOT the list', () => {
    expect(isFullScreenFlow('/transactions/new')).toBe(true)
    expect(isFullScreenFlow('/transactions/abc-123/edit')).toBe(true)
    expect(isFullScreenFlow('/transactions')).toBe(false)
  })
  it.each(['/start', '/start/intent', '/start/goal/emergency-fund', '/start/health-check', '/start/save'])(
    'hides chrome on the guest funnel %s', (path) => expect(isFullScreenFlow(path)).toBe(true)
  )
  it('hides nav on /forecast (More menu drill-in)', () => {
    expect(isFullScreenFlow('/forecast')).toBe(true)
  })
  it('keeps chrome on other root paths like /budget', () => {
    expect(isFullScreenFlow('/budget')).toBe(false)
  })
})
