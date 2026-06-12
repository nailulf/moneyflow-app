'use client'

import type { ReactNode } from 'react'
import { Info, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InfoBannerProps {
  variant: 'info' | 'success'
  children: ReactNode
}

/** Tinted note (design `UpZnO` / `EPjuN`). */
export function InfoBanner({ variant, children }: InfoBannerProps) {
  const Icon = variant === 'info' ? Info : CircleCheck
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-xl p-3 text-xs leading-caption',
        variant === 'info' ? 'bg-selected text-selected-foreground' : 'bg-success/10 text-success'
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
