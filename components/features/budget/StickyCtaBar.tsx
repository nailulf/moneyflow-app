import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Pins a budget-flow primary CTA to the bottom of the viewport while the form
 * scrolls underneath (design `2c` sticky footer). The bottom nav is hidden on
 * these full-screen flows, so bottom-0 is safe.
 */
export function StickyCtaBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 bg-background/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/75',
        className
      )}
    >
      {children}
    </div>
  )
}
