'use client'

import { Home, Wallet, Plus, PieChart, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { AddTransactionForm } from '@/components/features/transaction/AddTransactionForm'

export function MobileBottomNav() {
  const pathname = usePathname()
  const t = useTranslations('navigation.items')

  const navItems = [
    { title: t('home'), url: '/', icon: Home },
    { title: t('wallets'), url: '/accounts', icon: Wallet },
    { title: t('budget'), url: '/budget', icon: PieChart },
    { title: t('portfolio'), url: '/portfolio', icon: TrendingUp },
  ]

  const isActive = (url: string) => (url === '/' ? pathname === '/' : pathname.startsWith(url))

  const renderTab = (item: (typeof navItems)[number]) => {
    const active = isActive(item.url)
    return (
      <Link
        key={item.url}
        href={item.url}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 transition-colors',
          active ? 'flex-row gap-1.5 bg-primary/10 text-primary' : 'text-muted-foreground'
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span className="text-[11px] font-medium leading-none">{item.title}</span>
      </Link>
    )
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 pt-2 md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <div className="relative flex items-center justify-between gap-1 rounded-2xl border border-border/40 bg-background/95 px-2 py-1.5 shadow-lg shadow-black/10 backdrop-blur-xl">
        {navItems.slice(0, 2).map(renderTab)}

        {/* Center FAB — opens the existing Add-Transaction sheet */}
        <AddTransactionForm
          trigger={
            <button
              type="button"
              aria-label={t('addTransaction')}
              className="mx-1 flex h-14 w-14 shrink-0 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
            >
              <Plus className="h-7 w-7" />
            </button>
          }
        />

        {navItems.slice(2, 4).map(renderTab)}
      </div>
    </nav>
  )
}
