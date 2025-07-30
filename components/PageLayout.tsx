'use client'

import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn(
      "flex-1 p-0 flex justify-center", // Center content horizontally
      className
    )}>
        {children}
    </div>
  )
}

// Flexbox components for consistent layout with precise width control

export function MainContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn(
      "w-full sm:w-[60%] md:w-[55%] lg:w-[50%]", // 40-60% of display width, responsive
      "min-w-[60%] max-w-[70%]", // Enforce min/max constraints
      "p-2 md:p-4 lg:p-8", // Add padding for content spacing
      className
    )}>
      {children}
    </div>
  )
}

export function SideContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn(
      "w-full sm:w-[30%] md:w-[25%] lg:w-[20%]", // 20-30% of display width, responsive
      "min-w-[30%] max-w-[40%]", // Enforce min/max constraints
      "p-2 md:p-4 lg:p-8", // Add padding for content spacing
      className
    )}>
      {children}
    </div>
  )
}