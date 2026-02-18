'use client'

import { Home, DollarSign, Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AddTransactionForm } from '@/components/AddTransactionForm'

const navItems = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Spending', url: '/spending', icon: DollarSign },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="relative flex items-end justify-around border-t bg-background/80 px-6 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
        {/* Home */}
        <Link
          href={navItems[0].url}
          className={cn(
            'flex flex-col items-center gap-1 py-3 text-xs transition-colors',
            pathname === navItems[0].url
              ? 'text-primary'
              : 'text-muted-foreground'
          )}
        >
          <Home className="h-5 w-5" />
          <span>{navItems[0].title}</span>
        </Link>

        {/* Add Transaction - prominent FAB */}
        <div className="flex flex-col items-center -mt-5">
          <AddTransactionForm
            trigger={
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
                aria-label="Add Transaction"
              >
                <Plus className="h-7 w-7" />
              </button>
            }
          />
          <span className="mt-1 pb-[env(safe-area-inset-bottom)] text-xs text-muted-foreground">
            Add
          </span>
        </div>

        {/* Spending */}
        <Link
          href={navItems[1].url}
          className={cn(
            'flex flex-col items-center gap-1 py-3 text-xs transition-colors',
            pathname.startsWith(navItems[1].url)
              ? 'text-primary'
              : 'text-muted-foreground'
          )}
        >
          <DollarSign className="h-5 w-5" />
          <span>{navItems[1].title}</span>
        </Link>
      </div>
    </nav>
  )
}
