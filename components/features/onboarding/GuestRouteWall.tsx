'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Route-level signup wall: guests (anonymous Supabase sessions) may browse,
 * but every feature flow is signed-in-only — the `block_anon_*` RLS policies
 * reject their writes at the DB layer, so letting a guest into a form is a
 * dead end. Wrap a feature route's layout in this to send guests to the
 * conversion screen instead, mirroring the click-level `useGuestGuard` wall.
 *
 * While the auth session is still resolving we render nothing rather than
 * flash the walled page at a guest; signed-out (`user === null`) is passed
 * through since those pages handle the no-user state themselves.
 */
export function GuestRouteWall({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const isGuest = !!(user as { is_anonymous?: boolean } | null)?.is_anonymous

  useEffect(() => {
    if (!loading && isGuest) router.replace('/start/save')
  }, [loading, isGuest, router])

  if (loading || isGuest) return null
  return <>{children}</>
}
