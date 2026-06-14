'use client'

import { useTranslations } from 'next-intl'
import { NavUser } from '@/components/features/navigation/nav-user'
import { StickyScreenHeader } from '@/components/features/navigation/StickyScreenHeader'
import type { GreetingKey } from '@/lib/home-utils'

interface HomeGreetingHeaderProps {
  greetingKey: GreetingKey
  user: { name: string; email: string; avatar: string }
}

/** Home's own mobile header (design `r6cSh`) — greeting + name, NavUser avatar menu. */
export function HomeGreetingHeader({ greetingKey, user }: HomeGreetingHeaderProps) {
  const t = useTranslations('home')
  return (
    <StickyScreenHeader className="md:hidden">
      <div className="min-w-0">
        <p className="text-sm leading-body-sm text-muted-foreground">{t(`greeting.${greetingKey}`)}</p>
        <h1 className="truncate text-2xl font-bold leading-title-3 text-foreground">{user.name}</h1>
      </div>
      <div className="shrink-0">
        <NavUser user={user} />
      </div>
    </StickyScreenHeader>
  )
}
