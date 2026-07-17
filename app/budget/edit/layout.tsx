import { GuestRouteWall } from '@/components/features/onboarding/GuestRouteWall'

/** Budget editing is signed-in-only — guests are walled to /start/save. */
export default function BudgetEditLayout({ children }: { children: React.ReactNode }) {
  return <GuestRouteWall>{children}</GuestRouteWall>
}
