'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface TopNavigationProps {
  subMenus?: Array<{
    label: string
    href: string
  }>
  actionButton?: React.ReactNode
}

export function TopNavigation({ subMenus, actionButton }: TopNavigationProps) {
  const pathname = usePathname()

  return (
    <div className="bg-background">
      <div className="flex h-10 items-center justify-between">
        <div className="flex items-center space-x-6">
          {subMenus && subMenus.length > 0 && (
            <nav className="flex items-center space-x-2 px-4">
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
        {actionButton && <div>{actionButton}</div>}
      </div>
    </div>
  )
}

// Pre-configured navigation for specific pages
export function DashboardNavigation() {
  return <TopNavigation/>
}

export function SpendingNavigation({ actionButton }: { actionButton?: React.ReactNode }) {
  const subMenus = [
    { label: "Overview", href: "/spending" },
    { label: "Breakdown", href: "/spending/breakdown" },
    { label: "Cash Flow", href: "/spending/cashflow" },
    { label: "Transaction", href: "/spending/transaction" }
  ]
  return <TopNavigation subMenus={subMenus} actionButton={actionButton} />
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