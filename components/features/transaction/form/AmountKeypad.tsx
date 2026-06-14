'use client'

import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AmountAction } from '@/lib/transaction-form'

export interface AmountKeypadProps {
  onKey: (action: AmountAction) => void
}

type KeyDef =
  | { kind: 'digit'; digit: string }
  | { kind: 'thousands' }
  | { kind: 'backspace' }

const KEYS: KeyDef[] = [
  { kind: 'digit', digit: '1' },
  { kind: 'digit', digit: '2' },
  { kind: 'digit', digit: '3' },
  { kind: 'digit', digit: '4' },
  { kind: 'digit', digit: '5' },
  { kind: 'digit', digit: '6' },
  { kind: 'digit', digit: '7' },
  { kind: 'digit', digit: '8' },
  { kind: 'digit', digit: '9' },
  { kind: 'thousands' },
  { kind: 'digit', digit: '0' },
  { kind: 'backspace' },
]

export function AmountKeypad({ onKey }: AmountKeypadProps) {
  function handleKey(key: KeyDef) {
    if (key.kind === 'digit') {
      onKey({ type: 'appendDigit', digit: key.digit })
    } else if (key.kind === 'thousands') {
      onKey({ type: 'appendThousands' })
    } else {
      onKey({ type: 'backspace' })
    }
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {KEYS.map((key, i) => {
        if (key.kind === 'digit') {
          return (
            <button
              key={key.digit}
              type="button"
              onClick={() => handleKey(key)}
              className={cn(
                'flex h-14 items-center justify-center rounded-lg',
                'text-2xl leading-title-3 font-medium text-foreground',
                'bg-card border border-border',
                'active:bg-muted/50 transition-colors',
              )}
            >
              {key.digit}
            </button>
          )
        }

        if (key.kind === 'thousands') {
          return (
            <button
              key="thousands"
              type="button"
              onClick={() => handleKey(key)}
              className={cn(
                'flex h-14 items-center justify-center rounded-lg',
                'text-2xl leading-title-3 font-medium text-foreground',
                'bg-card border border-border',
                'active:bg-muted/50 transition-colors',
              )}
            >
              000
            </button>
          )
        }

        // backspace
        return (
          <button
            key="backspace"
            type="button"
            aria-label="Backspace"
            onClick={() => handleKey(key)}
            className={cn(
              'flex h-14 items-center justify-center rounded-lg',
              'text-foreground',
              'bg-card border border-border',
              'active:bg-muted/50 transition-colors',
            )}
          >
            <Delete className="size-6" />
          </button>
        )
      })}
    </div>
  )
}
