import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Pins a flow's primary CTA to the bottom of the viewport so it is always
 * reachable, regardless of content height or scroll position (design `2c`
 * footer). Uses `fixed` (not `sticky`) because the app shell forces
 * `min-h-[100vh]` on the content area — sticky only pins while scrolling, so a
 * short page would leave the CTA floating mid-screen.
 *
 * Renders an in-flow spacer (so scrolled content clears the bar) plus the fixed
 * bar itself, which fades content out behind it via a gradient. The container
 * is pointer-events-none so the transparent fade never blocks taps on the
 * content underneath; only the CTA itself is interactive.
 *
 * The bottom nav is hidden on these full-screen flows, so `bottom-0` is safe.
 */
export function StickyCtaBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <>
      <div aria-hidden className="h-24 shrink-0" />
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6',
          className
        )}
      >
        <div className="pointer-events-auto mx-auto w-full max-w-md">{children}</div>
      </div>
    </>
  )
}
