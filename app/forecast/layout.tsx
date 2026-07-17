import { GuestRouteWall } from '@/components/features/onboarding/GuestRouteWall'

/** Wealth forecast (root, assumptions, events, simulation) is signed-in-only — guests are walled to /start/save. */
export default function ForecastLayout({ children }: { children: React.ReactNode }) {
  return <GuestRouteWall>{children}</GuestRouteWall>
}
