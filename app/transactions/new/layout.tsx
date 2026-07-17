import { GuestRouteWall } from '@/components/features/onboarding/GuestRouteWall'

/** Add-transaction flow is signed-in-only — guests are walled to /start/save. */
export default function NewTransactionLayout({ children }: { children: React.ReactNode }) {
  return <GuestRouteWall>{children}</GuestRouteWall>
}
