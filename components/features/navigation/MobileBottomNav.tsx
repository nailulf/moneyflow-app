'use client'

import { Home, DollarSign, Plus, Wallet, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AddTransactionForm } from '@/components/features/transaction/AddTransactionForm'

const navItems = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Spend', url: '/spending', icon: DollarSign },
  { title: 'Account', url: '/accounts', icon: Wallet },
  { title: 'Invest', url: '/portfolio', icon: TrendingUp },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  const isActive = (url: string) =>
    url === '/' ? pathname === '/' : pathname.startsWith(url)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-3 pt-2"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <div className="relative flex items-center">
        {/* Nav items bar with left padding to accommodate FAB */}
        <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/95 pr-14 pr-2 py-1.5 shadow-lg shadow-black/10 backdrop-blur-xl w-full">
          {/* Left nav items */}
          {navItems.slice(0, 4).map((item) => {
            const active = isActive(item.url)
            return (
              <Link
                key={item.url}
                href={item.url}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 transition-all duration-200',
                  active
                    ? 'bg-primary px-3 text-primary-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {active && (
                  <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide">
                    {item.title}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
        {/* Right FAB - floating outside nav bar */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
          <AddTransactionForm
            trigger={
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95"
                aria-label="Add Transaction"
              >
                <Plus className="h-7 w-7" />
              </button>
            }
          />
        </div>
      </div>
    </nav>
  )
}
