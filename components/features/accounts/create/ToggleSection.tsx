'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Switch } from '@/components/ui/atoms/switch'
import { cn } from '@/lib/utils'

interface ToggleSectionProps {
  icon: LucideIcon
  iconClasses: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: ReactNode
}

/** Card with a switch header revealing extra rows (design `W8HsKt` mortgage block). */
export function ToggleSection({ icon: Icon, iconClasses, label, checked, onCheckedChange, children }: ToggleSectionProps) {
  return (
    <div className="rounded-2xl bg-card shadow-card">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-[10px]', iconClasses)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="flex-1 text-sm leading-body-sm font-bold text-foreground">{label}</span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      </div>
      {checked && <div className="divide-y divide-muted border-t border-muted">{children}</div>}
    </div>
  )
}
