'use client'

import type { ReactNode } from 'react'
import { NavUser } from '@/components/features/navigation/nav-user'

interface MobileScreenHeaderProps {
  title: string
  user: {
    name: string
    email: string
    avatar: string
  }
  /** Optional right-side action(s), rendered before the avatar menu. */
  action?: ReactNode
}

/**
 * Per-screen mobile header (spec sub-project 1): screens own their headers on
 * mobile; this is the interim title variant for screens not yet revamped.
 * Rendered by LayoutWrapper for routes without their own header — must stay
 * inside SidebarProvider, AuthProvider, and NextIntlClientProvider (NavUser
 * uses sidebar primitives, useAuth, and useTranslations).
 */
export function MobileScreenHeader({ title, user, action }: MobileScreenHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 px-4 pb-1 pt-3 md:hidden">
      <h1 className="min-w-0 truncate text-2xl font-bold leading-title-3 text-foreground">{title}</h1>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <NavUser user={user} />
      </div>
    </header>
  )
}
