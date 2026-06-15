'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { RecurringFrequency } from '@/lib/transaction-form'

export type { RecurringFrequency }

export interface RecurringFieldsValue {
  frequency: RecurringFrequency
  endDate: string | null
}

export interface RecurringFieldsProps {
  frequency: RecurringFrequency
  endDate: string | null
  onChange: (value: RecurringFieldsValue) => void
}

const FREQUENCY_VALUES: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly']

export function RecurringFields({ frequency, endDate, onChange }: RecurringFieldsProps) {
  const t = useTranslations('transactions.form')

  const FREQUENCIES: { value: RecurringFrequency; label: string }[] = FREQUENCY_VALUES.map((v) => ({
    value: v,
    label: t(v as 'daily' | 'weekly' | 'monthly' | 'yearly'),
  }))

  function handleFrequency(value: RecurringFrequency) {
    onChange({ frequency: value, endDate })
  }

  function handleNever() {
    onChange({ frequency, endDate: null })
  }

  function handleOnDate() {
    const defaultDate = new Date().toISOString().slice(0, 10)
    onChange({ frequency, endDate: defaultDate })
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ frequency, endDate: e.target.value })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Frequency group */}
      <div className="flex flex-col gap-2">
        <p className="text-sm leading-body-sm font-medium text-foreground">{t('repeat')}</p>
        <div className="flex flex-wrap gap-2">
          {FREQUENCIES.map(({ value, label }) => {
            const isSelected = value === frequency
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
        <p className="text-sm leading-body-sm font-medium text-foreground">{t('ends')}</p>
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
            {t('never')}
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
            {t('onDate')}
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
