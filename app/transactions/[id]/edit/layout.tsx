import { GuestRouteWall } from '@/components/features/onboarding/GuestRouteWall'

/** Edit-transaction flow is signed-in-only — guests are walled to /start/save. */
export default function EditTransactionLayout({ children }: { children: React.ReactNode }) {
  return <GuestRouteWall>{children}</GuestRouteWall>
}
