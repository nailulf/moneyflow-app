import { GuestRouteWall } from '@/components/features/onboarding/GuestRouteWall'

/**
 * Investment-account detail + add-asset/buy/sell flows are signed-in-only —
 * guests (who can't own accounts) are walled to /start/save. The /portfolio
 * tab itself stays browsable.
 */
export default function PortfolioAccountLayout({ children }: { children: React.ReactNode }) {
  return <GuestRouteWall>{children}</GuestRouteWall>
}
