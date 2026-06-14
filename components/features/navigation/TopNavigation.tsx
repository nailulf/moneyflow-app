'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/atoms/button'
import { AccountManager } from '@/components/AccountManager'

interface TopNavigationProps {
  subMenus?: Array<{
    label: string
    href: string
  }>
}

export function TopNavigation({ subMenus }: TopNavigationProps) {
  const pathname = usePathname()

  return (
    <div className="bg-background">
      <div className="flex h-10 items-center">
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          {subMenus && subMenus.length > 0 && (
            <nav className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4">
              {subMenus.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 text-sm leading-body-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0",
                    pathname === item.href
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}

// Pre-configured navigation for specific pages
export function DashboardNavigation() {
  return <TopNavigation/>
}

export function AccountNavigation() {
  const t = useTranslations('navigation.topNav')
  const tManager = useTranslations('accountManager')
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="bg-background">
      <div className="flex h-10 items-center">
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          <nav className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4">
            <Link
              href="/accounts"
              className={cn(
                "px-3 py-2 text-sm leading-body-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0",
                pathname === "/accounts"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {t('overview')}
            </Link>
          </nav>
        </div>
        <div className="px-2 sm:px-4 shrink-0">
          <Button size="sm" onClick={() => setOpen(true)} className="h-7 gap-1">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tManager('addAccount')}</span>
          </Button>
        </div>
      </div>
      <AccountManager open={open} onOpenChange={setOpen} defaultMode="create" />
    </div>
  )
}

export function SpendingNavigation() {
  const t = useTranslations('navigation.topNav')
  const subMenus = [
    { label: t('overview'), href: "/spending" },
    { label: t('breakdown'), href: "/spending/breakdown" },
    { label: t('cashFlow'), href: "/spending/cashflow" },
    { label: t('transaction'), href: "/spending/transaction" }
  ]
  return <TopNavigation subMenus={subMenus} />
}

export function PortfolioNavigation() {
  const t = useTranslations('navigation.topNav')
  const subMenus = [
    { label: t('overview'), href: "/portfolio" },
    { label: t('holdings'), href: "/portfolio/holdings" },
    { label: t('analytics'), href: "/portfolio/analytics" }
  ]
  return <TopNavigation subMenus={subMenus} />
}

export function InvestNavigation() {
  return <TopNavigation />
}

export function AdviceNavigation() {
  return <TopNavigation />
}

export function EstatePlanningNavigation() {
  return <TopNavigation />
}

export function EquityNavigation() {
  return <TopNavigation />
}

export function TaxNavigation() {
  return <TopNavigation />
}
