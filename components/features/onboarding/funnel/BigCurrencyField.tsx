'use client'

import * as React from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Big-number currency card used by the financial-health input steps (design
 * Flow 1 — IlDZo): a tinted icon square, a small label, and a large inline
 * `Rp` amount you type straight into. Matches the design's "Monthly income /
 * Rp 8.500.000" card rather than a plain labelled input.
 */
export interface BigCurrencyFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  /** Tinted icon for the card (e.g. TrendingUp for income). */
  icon: LucideIcon
  /** Combined bg + fg token classes for the icon square, e.g. 'bg-success/10 text-success'. */
  iconClassName: string
  disabled?: boolean
}

function formatIDR(value: number): string {
  if (!value) return ''
  return value.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

export function BigCurrencyField({
  id,
  label,
  value,
  onChange,
  icon: Icon,
  iconClassName,
  disabled = false,
}: BigCurrencyFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    onChange(raw === '' ? 0 : parseInt(raw, 10))
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-center gap-3.5 rounded-2xl border bg-card px-4 py-3.5 shadow-card transition-colors',
        'border-border focus-within:border-primary',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]',
          iconClassName
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-body-sm text-muted-foreground">{label}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-md font-bold text-foreground">Rp</span>
          <input
            id={id}
            data-testid={id}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            value={formatIDR(value)}
            onChange={handleChange}
            placeholder="0"
            aria-label={label}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-2xl leading-title-3 font-bold text-foreground outline-none placeholder:text-muted-foreground/40"
          />
        </span>
      </span>
    </label>
  )
}
