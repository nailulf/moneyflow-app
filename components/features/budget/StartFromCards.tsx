'use client'

import { useTranslations } from 'next-intl'
import { Copy, LayoutTemplate, Pencil, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StartFrom = 'copy' | 'template' | 'scratch'

interface StartFromCardsProps {
  value: StartFrom
  onChange: (v: StartFrom) => void
  copyAvailable: boolean
  copyHint?: string
}

const OPTIONS: Array<{ value: StartFrom; icon: LucideIcon; key: string }> = [
  { value: 'copy', icon: Copy, key: 'copy' },
  { value: 'template', icon: LayoutTemplate, key: 'template' },
  { value: 'scratch', icon: Pencil, key: 'scratch' },
]

/** "Start from" radio cards (design `cBvda`). */
export function StartFromCards({ value, onChange, copyAvailable, copyHint }: StartFromCardsProps) {
  const t = useTranslations('budgetCreate')
  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map((opt) => {
        const active = value === opt.value
        const disabled = opt.value === 'copy' && !copyAvailable
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left shadow-card transition-colors',
              active && 'ring-2 ring-primary',
              disabled && 'opacity-50'
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-selected">
              <opt.icon className="h-4 w-4 text-selected-foreground" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-body-sm font-semibold text-foreground">{t(`startFrom.${opt.key}`)}</span>
              <span className="block text-tiny text-muted-foreground">
                {opt.value === 'copy' && copyHint ? copyHint : t(`startFrom.${opt.key}Hint`)}
              </span>
            </span>
            <span aria-hidden="true" className={cn('h-4 w-4 shrink-0 rounded-full border-2', active ? 'border-primary bg-primary' : 'border-border')} />
          </button>
        )
      })}
    </div>
  )
}
