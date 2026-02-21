'use client'

import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  currency?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  id?: string
}

function formatIDR(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

export function CurrencyInput({
  value,
  onChange,
  currency = 'IDR',
  disabled,
  placeholder = '0',
  className,
  id
}: CurrencyInputProps) {
  const currencySymbol = currency === 'IDR' ? 'Rp' : currency

  const displayValue = value === 0 ? '' : formatIDR(value)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip everything except digits
    const raw = e.target.value.replace(/\D/g, '')
    const parsed = raw === '' ? 0 : parseInt(raw, 10)
    onChange(isNaN(parsed) ? 0 : parsed)
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none pointer-events-none">
        {currencySymbol}
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-sm shadow-sm transition-colors',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />
    </div>
  )
}
