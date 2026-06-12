'use client'

import { createElement } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, X } from 'lucide-react'
import { Switch } from '@/components/ui/atoms/switch'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { formatCurrency, formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

interface EditorRow {
  category_id: string
  category_name: string
  allocated_amount: number
}

interface BudgetAmountsEditorProps {
  rows: EditorRow[]
  suggestions: Map<string, number>
  suggestionsOn: boolean
  onToggleSuggestions: (on: boolean) => void
  onAmountChange: (categoryId: string, amount: number) => void
  onRemove: (categoryId: string) => void
  onAddCategory: () => void
  totalAllocated: number
  currency: string
}

/** Set-amounts list (design `VkK5R`): suggestion toggle, editable rows, add row, total footer. */
export function BudgetAmountsEditor({
  rows, suggestions, suggestionsOn, onToggleSuggestions, onAmountChange, onRemove, onAddCategory, totalAllocated, currency,
}: BudgetAmountsEditorProps) {
  const t = useTranslations('budgetCreate')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-card">
        <span className="text-sm leading-body-sm font-semibold text-foreground">{t('amounts.suggestToggle')}</span>
        <Switch checked={suggestionsOn} onCheckedChange={onToggleSuggestions} aria-label={t('amounts.suggestToggle')} />
      </div>
      <div className="divide-y divide-muted rounded-2xl bg-card shadow-card">
        {rows.map((row) => {
          const tint = getCategoryTint(row.category_name)
          const suggestion = suggestions.get(row.category_id)
          return (
            <div key={row.category_id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tint.bg)} aria-hidden="true">
                {createElement(getCategoryIcon(row.category_name), { className: cn('h-4 w-4', tint.fg) })}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm leading-body-sm font-semibold text-foreground">{row.category_name}</span>
                {suggestionsOn && suggestion !== undefined && (
                  <span className="text-tiny text-muted-foreground">
                    {t('amounts.suggested', { amount: formatCurrencyCompact(suggestion, currency) })}
                  </span>
                )}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                aria-label={row.category_name}
                value={row.allocated_amount === 0 ? '' : row.allocated_amount}
                onChange={(e) => onAmountChange(row.category_id, Number(e.target.value) || 0)}
                className="w-28 rounded-lg bg-muted px-2 py-1.5 text-right text-sm leading-body-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="button" aria-label={t('amounts.remove', { name: row.category_name })} onClick={() => onRemove(row.category_id)}
                className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted/50">
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
        <button
          type="button"
          onClick={onAddCategory}
          className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-sm leading-body-sm font-semibold text-primary transition-colors hover:bg-muted/50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('amounts.addCategory')}
        </button>
      </div>
      <p className="flex items-center justify-between px-1">
        <span className="text-sm leading-body-sm text-muted-foreground">{t('amounts.total')}</span>
        <span className="text-md leading-body-lg font-bold text-primary">{formatCurrency(totalAllocated, currency)}</span>
      </p>
    </div>
  )
}
