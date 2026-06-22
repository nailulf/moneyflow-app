'use client'

import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'

interface MoneyInputProps<
  TFieldValues extends FieldValues,
  TTransformedValues extends FieldValues = TFieldValues,
> {
  // The create forms use useForm<input, unknown, output>, so control is the
  // 3-generic Control<input, unknown, output>; mirror that here.
  control: Control<TFieldValues, unknown, TTransformedValues>
  name: FieldPath<TFieldValues>
  label: string
  currency?: string
}

/**
 * Inline money field for the create-account FormCard rows (design `CuDYL`:
 * "Initial Balance  Rp 0"). Bridges CurrencyInput (numeric value/onChange + IDR
 * thousand-separators) to react-hook-form's string-based field via a Controller,
 * so the existing Zod schemas (string → number) stay untouched. Styled as the
 * transparent inline variant so it reads as a settings-row, not a boxed input.
 */
export function MoneyInput<
  TFieldValues extends FieldValues,
  TTransformedValues extends FieldValues = TFieldValues,
>({ control, name, label, currency = 'IDR' }: MoneyInputProps<TFieldValues, TTransformedValues>) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <CurrencyInput
              value={Number(field.value) || 0}
              onChange={(n) => field.onChange(String(n))}
              currency={currency}
              aria-label={label}
              className="h-auto w-full border-none bg-transparent py-0 pr-0 pl-9 text-sm leading-body-sm font-semibold text-foreground shadow-none focus-visible:ring-0"
            />
          )}
        />
      </div>
    </div>
  )
}
