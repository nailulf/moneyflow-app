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
          'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[20px] px-3 py-[5px] transition-colors',
          active ? 'bg-selected text-selected-foreground' : 'text-muted-foreground'
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span className={cn('whitespace-nowrap text-[11px] leading-none', active ? 'font-semibold' : 'font-medium')}>
          {item.title}
        </span>
      </Link>
    )
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-4 md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <div className="flex h-14 items-center justify-between gap-0.5 rounded-[28px] bg-card/95 p-1.5 shadow-floating backdrop-blur-xl">
        {navItems.slice(0, 2).map(renderTab)}

        {/* Center add button — sits inside the bar, opens the Add-Transaction sheet */}
        <AddTransactionForm
          trigger={
            <button
              type="button"
              aria-label={t('addTransaction')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
          }
        />

        {navItems.slice(2, 4).map(renderTab)}
      </div>
    </nav>
  )
}
