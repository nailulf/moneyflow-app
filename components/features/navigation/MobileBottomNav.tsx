'use client'

import { Home, DollarSign, Receipt, Wallet, TrendingUp } from 'lucide-react'
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
      <div className="relative flex items-center grid grid-cols-5 my-auto">
        {/* Nav items bar with left padding to accommodate FAB */}
        <div className="flex items-center col-span-4 justify-between rounded-2xl border border-border/40 bg-background/95 py-1.5 shadow-lg shadow-black/10 backdrop-blur-xl w-full">
          {/* Left nav items */}
          {navItems.slice(0, 4).map((item) => {
            const active = isActive(item.url)
            return (
              <Link
                key={item.url}
                href={item.url}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 mx-2 transition-all duration-200',
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
        <div className="absolute right-0 items-center top-1/2 -translate-y-1/2 z-10 col-span-1 ">
          <AddTransactionForm
            trigger={
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/10 backdrop-blur-xl transition-transform active:scale-95"
                aria-label="Add Transaction"
              >
                <Receipt className="h-7 w-7" />
              </button>
            }
          />
        </div>
      </div>
    </nav>
  )
}
