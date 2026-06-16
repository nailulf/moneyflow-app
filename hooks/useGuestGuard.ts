import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function useGuestGuard() {
  const router = useRouter()
  const { user } = useAuth()
  const isGuest = !!(user as { is_anonymous?: boolean } | null)?.is_anonymous

  /** Run `action` for permanent users; route guests to the signup wall. */
  function guard(action: () => void) {
    if (isGuest) { router.push('/start/save'); return }
    action()
  }
  return { isGuest, guard }
}
