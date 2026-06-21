'use client'

import Link from 'next/link'
import { Plus, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/atoms/button'
import { cn } from '@/lib/utils'

interface EmptyCta {
  label: string
  href: string
}

interface HomeEmptyStateProps {
  icon: LucideIcon
  /** Tailwind bg utility for the icon bubble, e.g. `bg-selected`. */
  bubbleClassName: string
  /** Tailwind text-color utility for the icon, e.g. `text-primary`. */
  iconClassName: string
  title: string
  description: string
  cta?: EmptyCta
  /**
   * `stacked` — centered icon/title/description with an optional CTA below
   * (design: Accounts, Upcoming, Biggest). `inline` — icon left, copy middle,
   * CTA right (design: Budget, Goals).
   */
  variant?: 'stacked' | 'inline'
}

/**
 * New-user empty-state card for the mobile home sections (design `Kw47b`).
 * Two layouts share one icon-bubble + title + helper-text treatment.
 */
export function HomeEmptyState({
  icon: Icon,
  bubbleClassName,
  iconClassName,
  title,
  description,
  cta,
  variant = 'stacked',
}: HomeEmptyStateProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', bubbleClassName)}>
          <Icon className={cn('h-5 w-5', iconClassName)} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm leading-body-sm font-bold text-foreground">{title}</p>
          <p className="text-xs leading-caption text-muted-foreground">{description}</p>
        </div>
        {cta && (
          <Button asChild size="sm" className="shrink-0 rounded-xl">
            <Link href={cta.href}>
              <Plus className="size-4" aria-hidden="true" />
              {cta.label}
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card px-6 py-8 text-center shadow-card">
      <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', bubbleClassName)}>
        <Icon className={cn('h-6 w-6', iconClassName)} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm leading-body-sm font-bold text-foreground">{title}</p>
        <p className="mx-auto max-w-[16rem] text-xs leading-caption text-muted-foreground">{description}</p>
      </div>
      {cta && (
        <Button asChild className="mt-1 rounded-xl">
          <Link href={cta.href}>
            <Plus className="size-4" aria-hidden="true" />
            {cta.label}
          </Link>
        </Button>
      )}
    </div>
  )
}
