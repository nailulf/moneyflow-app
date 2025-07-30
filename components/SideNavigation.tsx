'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Home, DollarSign, PieChart, TrendingUp, Lightbulb, Building, Landmark, Scale, ChevronLeft, ChevronRight } from 'lucide-react'

interface SideNavigationProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function SideNavigation({ collapsed, setCollapsed }: SideNavigationProps) {
  const pathname = usePathname()

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Spending', href: '/spending', icon: DollarSign },
    { name: 'Portfolio', href: '/portfolio', icon: PieChart },
    { name: 'Invest', href: '/invest', icon: TrendingUp },
    { name: 'Advice', href: '/advice', icon: Lightbulb },
    { name: 'Estate Planning', href: '/estate-planning', icon: Building },
    { name: 'Equity', href: '/equity', icon: Landmark },
    { name: 'Tax', href: '/tax', icon: Scale },
  ]

  return (
    <div className={cn(
      'flex h-screen flex-col overflow-hidden border-r bg-background transition-all duration-300 ease-in-out fixed top-0 left-0',
      collapsed ? 'w-20' : 'w-64'
    )}>
      <div className="flex h-16 items-center px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          {!collapsed && <span className="text-lg">MoneyFlow</span>}
        </Link>
      </div>
      <nav className="flex-1 overflow-auto px-2 py-2 lg:px-4">
        <ul className="grid items-start gap-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start',
                  pathname === item.href && 'bg-muted hover:bg-muted',
                  collapsed ? 'px-2' : 'px-4'
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className={cn('h-5 w-5', !collapsed && 'mr-3')} />
                  {!collapsed && item.name}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  )
}