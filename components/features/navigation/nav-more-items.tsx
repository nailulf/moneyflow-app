'use client'

import Link from 'next/link'
import { Receipt, Binoculars, DollarSign, Lightbulb, TrendingUp, Landmark, BarChart3 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DropdownMenuItem } from '@/components/ui/molecules/dropdown-menu'

// Non-tab destinations: the temporary Transactions entry (until Home/Wallets wire contextual
// "see all" links) + secondary features. Only routes that exist today.
// NOTE: temporary placement — see docs/.../specs/2026-06-11-mobile-shell-navigation-design.md §2/§4.4.
export const MORE_NAV_ITEMS = [
  { href: '/transactions', labelKey: 'transactions', icon: Receipt },
  { href: '/forecast', labelKey: 'forecast', icon: Binoculars },
  { href: '/spending', labelKey: 'spending', icon: DollarSign },
  { href: '/advice', labelKey: 'advice', icon: Lightbulb },
  { href: '/invest', labelKey: 'invest', icon: TrendingUp },
  { href: '/equity', labelKey: 'equity', icon: Landmark },
  { href: '/charts', labelKey: 'charts', icon: BarChart3 },
] as const

export function NavMoreItems() {
  const t = useTranslations('navigation.items')
  return (
    <>
      {MORE_NAV_ITEMS.map((item) => (
        <DropdownMenuItem key={item.href} asChild>
          <Link href={item.href}>
            <item.icon />
            {t(item.labelKey)}
          </Link>
        </DropdownMenuItem>
      ))}
    </>
  )
}
