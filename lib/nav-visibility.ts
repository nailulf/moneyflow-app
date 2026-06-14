/** Routes that render as full-screen flows: no bottom tab bar, no nav clearance padding. */
const FULL_SCREEN_FLOW_PREFIXES = ['/accounts/new', '/budget/create', '/budget/edit']

// Portfolio drill-ins (/portfolio/<accountId>[/add]) are full-screen, but the bare
// /portfolio root and the desktop sub-pages (/portfolio/holdings, /portfolio/analytics) are not.
const PORTFOLIO_NON_DETAIL = new Set(['holdings', 'analytics'])
function isPortfolioDetail(pathname: string): boolean {
  const m = pathname.match(/^\/portfolio\/([^/]+)/)
  return m !== null && !PORTFOLIO_NON_DETAIL.has(m[1])
}

export const isFullScreenFlow = (pathname: string): boolean =>
  FULL_SCREEN_FLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || isPortfolioDetail(pathname)
