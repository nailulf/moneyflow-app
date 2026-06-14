'use client'

import { cn } from '@/lib/utils'

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurringFieldsValue {
  frequency: RecurringFrequency
  endDate: string | null
}

export interface RecurringFieldsProps {
  frequency: RecurringFrequency | null
  endDate: string | null
  onChange: (value: RecurringFieldsValue) => void
}

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export function RecurringFields({ frequency, endDate, onChange }: RecurringFieldsProps) {
  const effectiveFrequency: RecurringFrequency = frequency ?? 'monthly'

  function handleFrequency(value: RecurringFrequency) {
    onChange({ frequency: value, endDate })
  }

  function handleNever() {
    onChange({ frequency: effectiveFrequency, endDate: null })
  }

  function handleOnDate() {
    const defaultDate = new Date().toISOString().slice(0, 10)
    onChange({ frequency: effectiveFrequency, endDate: defaultDate })
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ frequency: effectiveFrequency, endDate: e.target.value })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Frequency group */}
      <div className="flex flex-col gap-2">
        <p className="text-sm leading-body-sm font-medium text-foreground">Repeat</p>
        <div className="flex flex-wrap gap-2">
          {FREQUENCIES.map(({ value, label }) => {
            const isSelected = value === effectiveFrequency
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleFrequency(value)}
                className={cn(
                  'inline-flex h-[52px] items-center justify-center rounded-full px-4',
                  'text-sm leading-body-sm font-medium',
                  'border transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-muted/50',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Ends group */}
      <div className="flex flex-col gap-2">
        <p className="text-sm leading-body-sm font-medium text-foreground">Ends</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleNever}
            className={cn(
              'inline-flex h-[52px] items-center justify-center rounded-full px-4',
              'text-sm leading-body-sm font-medium',
              'border transition-colors',
              endDate === null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:bg-muted/50',
            )}
          >
            Never
          </button>
          <button
            type="button"
            onClick={handleOnDate}
            className={cn(
              'inline-flex h-[52px] items-center justify-center rounded-full px-4',
              'text-sm leading-body-sm font-medium',
              'border transition-colors',
              endDate !== null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:bg-muted/50',
            )}
          >
            On date
          </button>
        </div>

        {endDate !== null && (
          <input
            type="date"
            value={endDate}
            onChange={handleDateChange}
            className={cn(
              'h-[52px] rounded-[14px] border border-input bg-card px-4',
              'text-md leading-body-lg text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'w-full',
            )}
          />
        )}
      </div>
    </div>
  )
}
