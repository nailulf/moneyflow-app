/** Routes that render as full-screen flows: no bottom tab bar, no nav clearance padding. */
const FULL_SCREEN_FLOW_PREFIXES = ['/accounts/new', '/budget/create', '/budget/edit', '/transactions/new', '/start']

// Portfolio drill-ins (/portfolio/<accountId>[/add]) are full-screen, but the bare
// /portfolio root and the desktop sub-pages (/portfolio/holdings, /portfolio/analytics) are not.
const PORTFOLIO_NON_DETAIL = new Set(['holdings', 'analytics'])
function isPortfolioDetail(pathname: string): boolean {
  const m = pathname.match(/^\/portfolio\/([^/]+)/)
  return m !== null && !PORTFOLIO_NON_DETAIL.has(m[1])
}

// /transactions/<id>/edit is full-screen; /transactions (list) is NOT.
function isTransactionEdit(pathname: string): boolean {
  return /^\/transactions\/[^/]+\/edit$/.test(pathname)
}

// /accounts/<id> is a full-screen detail; /accounts (list) and /accounts/new are not.
function isAccountDetail(pathname: string): boolean {
  const m = pathname.match(/^\/accounts\/([^/]+)/)
  return m !== null && m[1] !== 'new'
}

export const isFullScreenFlow = (pathname: string): boolean =>
  FULL_SCREEN_FLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
  isPortfolioDetail(pathname) ||
  isTransactionEdit(pathname) ||
  isAccountDetail(pathname)
