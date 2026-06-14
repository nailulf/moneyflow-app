'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function FormCard({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-muted rounded-2xl bg-card shadow-card">{children}</div>
}

interface FormRowProps {
  icon: LucideIcon
  error?: string
  children: ReactNode
}

/** One h52 input row (design `CuDYL` rows): muted icon prefix + control + optional error line. */
export function FormRow({ icon: Icon, error, children }: FormRowProps) {
  return (
    <div className="px-4">
      <label className="flex min-h-[52px] items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">{children}</div>
      </label>
      {error && <p className="pb-2 text-xs leading-caption text-destructive">{error}</p>}
    </div>
  )
}
