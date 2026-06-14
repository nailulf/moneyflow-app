import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Pins a mobile screen's header (title + actions) to the top while the screen
 * scrolls underneath, so the title and primary actions stay reachable. Plain
 * `sticky top-0` is enough at the top (a top-anchored element sits at the top
 * even when the page fits — unlike the bottom CTA, which needs `fixed`; see
 * `StickyCtaBar`). `-mt-3` cancels the screen container's `pt-3` so the
 * translucent backdrop-blur band sits flush at the very top.
 *
 * Reverts to a plain static header on `md+`, where the app shell renders its own
 * header (`LayoutWrapper`) and most of these screens are `md:hidden` anyway.
 */
export function StickyScreenHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 -mt-3 flex items-center justify-between gap-2 bg-background/90 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75',
        'md:static md:mt-0 md:bg-transparent md:py-0 md:backdrop-blur-none',
        className
      )}
    >
      {children}
    </header>
  )
}
