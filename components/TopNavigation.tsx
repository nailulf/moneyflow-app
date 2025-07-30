'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center space-x-6">
          {subMenus && subMenus.length > 0 && (
            <nav className="flex items-center space-x-2 px-12">
              {subMenus.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
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

export function SpendingNavigation() {
  const subMenus = [
    { label: "Overview", href: "/spending" },
    { label: "Breakdown", href: "/spending/breakdown" },
    { label: "Transaction", href: "/spending/transaction" }
  ]
  return <TopNavigation subMenus={subMenus} />
}

export function PortfolioNavigation() {
  const subMenus = [
    { label: "Overview", href: "/portfolio" },
    { label: "Holdings", href: "/portfolio/holdings" },
    { label: "Analytics", href: "/portfolio/analytics" }
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