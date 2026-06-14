'use client'

import { cn } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}

/** Grey-track segmented control (design `CuDYL`/`ck0jG`; also the transactions B2 primitive). */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex rounded-2xl bg-muted p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-xl px-3 py-2.5 text-sm leading-body-sm font-semibold transition-colors',
              active ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
