/** Routes that render as full-screen flows: no bottom tab bar, no nav clearance padding. */
const FULL_SCREEN_FLOW_PREFIXES = ['/accounts/new', '/budget/create', '/budget/edit']

export const isFullScreenFlow = (pathname: string): boolean =>
  FULL_SCREEN_FLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix))
