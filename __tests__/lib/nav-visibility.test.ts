import { isFullScreenFlow } from '@/lib/nav-visibility'

describe('isFullScreenFlow', () => {
  it.each(['/accounts/new', '/accounts/new/bank', '/budget/create', '/budget/create?period=yearly', '/budget/edit'])(
    'hides chrome on %s', (path) => expect(isFullScreenFlow(path)).toBe(true)
  )
  it.each(['/', '/accounts', '/budget', '/transactions', '/portfolio'])(
    'keeps chrome on %s', (path) => expect(isFullScreenFlow(path)).toBe(false)
  )
})
