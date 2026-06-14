'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/organisms/sheet'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import type { TxnType } from '@/lib/transaction-form'

// Minimal category shape — subset of the DB Row
export interface PickerCategory {
  id: string
  name: string
  group_type: string
}

export interface CategoryPickerSheetProps {
  open: boolean
  type: TxnType
  categories: PickerCategory[]
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenChange: (open: boolean) => void
}

export function CategoryPickerSheet({
  open,
  type,
  categories,
  selectedId,
  onSelect,
  onOpenChange,
}: CategoryPickerSheetProps) {
  const t = useTranslations('transactions.form')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const filtered = categories
    .filter((c) => c.group_type === type)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  const handleSelect = (id: string) => {
    onSelect(id)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{t('categorySheetTitle')}</SheetTitle>
          <SheetDescription className="sr-only">{t('categorySheetDescription')}</SheetDescription>
        </SheetHeader>

        {/* Search input */}
        <div className="px-4 py-3">
          <input
            type="text"
            placeholder={t('searchCategory')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full rounded-md border border-input bg-transparent px-3 py-2',
              'text-md leading-body-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            )}
          />
        </div>

        {/* Category grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="grid grid-cols-4 gap-3">
            {filtered.map((cat) => {
              const Icon = getCategoryIcon(cat.name)
              const tint = getCategoryTint(cat.name)
              const isSelected = cat.id === selectedId

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg p-2',
                    'hover:bg-muted/50 active:bg-muted transition-colors',
                    isSelected && 'ring-2 ring-primary',
                  )}
                >
                  {/* Icon tint circle */}
                  <span
                    className={cn(
                      'flex size-11 items-center justify-center rounded-full',
                      tint.bg,
                    )}
                  >
                    <Icon className={cn('size-5', tint.fg)} />
                  </span>
                  {/* Category name */}
                  <span className="text-nano leading-caption text-center text-foreground line-clamp-2 w-full">
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
