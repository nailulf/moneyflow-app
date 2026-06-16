import { cn } from '@/lib/utils'

interface FunnelProgressProps {
  /** Total number of funnel steps. */
  total: number
  /** Active step index (0-based). */
  current: number
}

/**
 * Decorative step indicator for the pre-account onboarding funnel.
 * Renders `total` rounded dots; the dot at `current` is elongated and filled
 * with the brand color, the rest are muted.
 */
export function FunnelProgress({ total, current }: FunnelProgressProps) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i === current ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}
