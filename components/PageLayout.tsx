'use client'

import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn(
      "p-0 w-full",
      // Grid layout for small screens (mobile-first)
      "grid grid-cols-1 gap-4 justify-items-center",
      // Flexbox layout for larger screens
      "sm:flex sm:flex-col sm:items-center",
      className
    )}>
      {children}
    </div>
  )
}

// Flexbox components for consistent layout with precise width control
export function TopContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn(
      // Full width on all screen sizes
      "w-full order-0",
      // Match the combined width of MainContent + SideContent on larger screens
      "sm:w-full sm:max-w-[100%]",
      // Match the padding of MainContent and SideContent to align perfectly
      "p-0 md:p-2 lg:p-4",
      // Margin bottom for spacing from content below
      "mb-0",
      className
    )}>
        {children}
    </div>
  )
}

export function ContentWrapper({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn(
      // Grid layout for small screens
      "w-full grid grid-cols-1 gap-4 order-1",
      // Flexbox layout for larger screens to contain MainContent and SideContent side by side
      "sm:flex sm:justify-center sm:w-full",
      className
    )}>
      {children}
    </div>
  )
}

export function MainContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn(
      // Grid layout for small screens - takes 1 grid row, appears after SideContent
      "w-full order-2",
      // Flexbox layout for larger screens
      "sm:w-[80%] md:w-[80%] lg:w-[80%] sm:order-1",
      "sm:min-w-[60%] sm:max-w-[80%]", // Enforce min/max constraints on larger screens
      "p-0 md:p-2 lg:p-4", // Add padding for content spacing
      className
    )}>
      {children}
    </div>
  )
}

export function SideContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn(
      // Grid layout for small screens - takes max 2 grid rows, appears at top
      "w-full order-1 grid-rows-[max-content]",
      // Flexbox layout for larger screens
      "sm:w-[30%] md:w-[25%] lg:w-[20%] sm:order-2",
      "sm:min-w-[30%] sm:max-w-[40%]", // Enforce min/max constraints on larger screens
      "p-0 md:p-2 lg:p-4", // Add padding for content spacing
      className
    )}>
      {children}
    </div>
  )
}

