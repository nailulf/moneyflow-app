import { GuestRouteWall } from '@/components/features/onboarding/GuestRouteWall'

/** Account creation (all types) is signed-in-only — guests are walled to /start/save. */
export default function NewAccountLayout({ children }: { children: React.ReactNode }) {
  return <GuestRouteWall>{children}</GuestRouteWall>
}
