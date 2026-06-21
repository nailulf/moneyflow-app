'use client'

import { Skeleton } from '@/components/ui/atoms/skeleton'
import { cn } from '@/lib/utils'

/** A section: short header bar + its body. */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-28" />
      {children}
    </div>
  )
}

/** White card shell matching the real home cards (rounded-2xl + shadow). */
function Card({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn('rounded-2xl bg-card p-3.5 shadow-card', className)}>{children}</div>
}

/** A list row: avatar bubble + two stacked lines + trailing amount. */
function ListRow() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
      <Skeleton className="h-3 w-14" />
    </div>
  )
}

/**
 * Full-screen loading placeholder for the mobile home. Mirrors the real
 * section order (Today → Hero → Accounts → Budget → Goals → Upcoming →
 * Biggest) so swapping skeleton → content causes no layout shift and no
 * section "pops in" after the rest has rendered.
 */
export function MobileHomeSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      {/* Today hook card */}
      <Card className="flex flex-col gap-3 p-3.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 flex-1 rounded-xl" />
          ))}
        </div>
      </Card>

      {/* Net-worth hero */}
      <div className="flex flex-col gap-4 rounded-[20px] bg-hero-gradient p-5">
        <Skeleton className="h-3 w-24 bg-hero-foreground/15" />
        <Skeleton className="h-7 w-40 bg-hero-foreground/15" />
        <div className="flex items-end gap-1.5 pt-1">
          {[40, 64, 52, 72, 48, 80, 56, 68, 44, 76, 60, 70].map((h, i) => (
            <Skeleton key={i} className="flex-1 bg-hero-foreground/15" style={{ height: h }} />
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-4 flex-1 bg-hero-foreground/15" />
          <Skeleton className="h-4 flex-1 bg-hero-foreground/15" />
        </div>
      </div>

      {/* Accounts 2-up */}
      <Section>
        <div className="flex gap-3">
          {[0, 1].map((i) => (
            <Card key={i} className="flex flex-1 flex-col gap-3 p-3.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-10 rounded-[10px]" />
              </div>
              <Skeleton className="h-6 w-24" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-2.5 w-3/4" />
                <Skeleton className="h-2.5 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Budget */}
      <Section>
        <Card className="flex items-center gap-3 p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-2.5 w-3/4" />
            <Skeleton className="mt-1 h-3 w-full rounded-md" />
          </div>
        </Card>
      </Section>

      {/* Goals 2-up */}
      <Section>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <Card key={i} className="flex flex-col gap-2.5 p-3.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-8 rounded-[10px]" />
                <Skeleton className="h-4 w-9 rounded-[10px]" />
              </div>
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
              <Skeleton className="h-1.5 w-full rounded-sm" />
            </Card>
          ))}
        </div>
      </Section>

      {/* Upcoming list */}
      <Section>
        <Card className="flex flex-col gap-3 p-3.5">
          {[0, 1, 2].map((i) => (
            <ListRow key={i} />
          ))}
        </Card>
      </Section>

      {/* Biggest list */}
      <Section>
        <Card className="flex flex-col gap-3 p-3.5">
          {[0, 1, 2].map((i) => (
            <ListRow key={i} />
          ))}
        </Card>
      </Section>
    </div>
  )
}
