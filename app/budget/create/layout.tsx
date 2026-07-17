import { GuestRouteWall } from '@/components/features/onboarding/GuestRouteWall'

/** Budget creation is signed-in-only — guests are walled to /start/save. */
export default function BudgetCreateLayout({ children }: { children: React.ReactNode }) {
  return <GuestRouteWall>{children}</GuestRouteWall>
}
