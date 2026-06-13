'use client'

import { createElement, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Plus } from 'lucide-react'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { formatCurrencyCompact } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

export interface SelectableCategory {
  id: string
  name: string
}

interface YearlyCategorySelectorProps {
  /** All selectable categories (available ∪ already-selected), in display order. */
  categories: SelectableCategory[]
  /** categoryId → allocated amount, for the currently-selected categories. */
  selected: Map<string, number>
  currency: string
  /** Toggle a category in/out of the yearly budget. */
  onToggle: (cat: SelectableCategory) => void
  /** Edit the amount of an already-selected category. */
  onAmountChange: (categoryId: string, amount: number) => void
}

/**
 * Checkbox-style category picker for the yearly flow (design `eTQEb`): every
 * eligible category is a toggleable row with a tinted icon and an inline-editable
 * amount pill; a footer shows the selected count and running yearly total.
 */
export function YearlyCategorySelector({
  categories,
  selected,
  currency,
  onToggle,
  onAmountChange,
}: YearlyCategorySelectorProps) {
  const t = useTranslations('budgetCreate')
  const [editingId, setEditingId] = useState<string | null>(null)

  const selectedCount = selected.size
  const total = [...selected.values()].reduce((s, v) => s + v, 0)

  const handleToggle = (cat: SelectableCategory) => {
    const wasSelected = selected.has(cat.id)
    onToggle(cat)
    // Newly selected → jump straight into amount entry.
    setEditingId(wasSelected ? null : cat.id)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm leading-body-sm font-semibold text-foreground">
          {t('yearlyAmounts.available')}
        </span>
        <span className="text-tiny font-medium text-muted-foreground">
          {t('yearlyAmounts.categoryCount', { count: categories.length })}
        </span>
      </div>

      <div className="divide-y divide-muted rounded-2xl bg-card shadow-card">
        {categories.map((cat) => {
          const isSelected = selected.has(cat.id)
          const amount = selected.get(cat.id) ?? 0
          const tint = getCategoryTint(cat.name)
          const isEditing = editingId === cat.id
          return (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                aria-label={cat.name}
                onClick={() => handleToggle(cat)}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors',
                  isSelected ? 'bg-primary' : 'border-2 border-border bg-card'
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" aria-hidden="true" />}
              </button>

              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity',
                  tint.bg,
                  !isSelected && 'opacity-50'
                )}
                aria-hidden="true"
              >
                {createElement(getCategoryIcon(cat.name), { className: cn('h-4 w-4', tint.fg) })}
              </span>

              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm leading-body-sm font-semibold',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {cat.name}
              </span>

              {isSelected ? (
                isEditing ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    autoFocus
                    aria-label={cat.name}
                    value={amount === 0 ? '' : amount}
                    onChange={(e) => onAmountChange(cat.id, Number(e.target.value) || 0)}
                    onBlur={() => setEditingId(null)}
                    className="w-24 rounded-lg bg-muted px-2 py-1.5 text-right text-sm leading-body-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingId(cat.id)}
                    className="rounded-lg bg-selected px-2.5 py-1 text-sm leading-body-sm font-semibold text-selected-foreground"
                  >
                    {formatCurrencyCompact(amount, currency)}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  aria-label={cat.name}
                  onClick={() => handleToggle(cat)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="flex items-center justify-between px-1">
        <span className="text-sm leading-body-sm text-muted-foreground">
          {t('yearlyAmounts.selectedCount', { selected: selectedCount, total: categories.length })}
        </span>
        <span className="text-md leading-body-lg font-bold text-primary">
          {t('yearlyAmounts.yearlyTotal', { amount: formatCurrencyCompact(total, currency) })}
        </span>
      </p>
    </div>
  )
}
