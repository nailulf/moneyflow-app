import { GuestRouteWall } from '@/components/features/onboarding/GuestRouteWall'

/** Financial goals (list + detail) are signed-in-only — guests are walled to /start/save. */
export default function GoalsLayout({ children }: { children: React.ReactNode }) {
  return <GuestRouteWall>{children}</GuestRouteWall>
}
