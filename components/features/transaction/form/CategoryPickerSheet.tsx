'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Check, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/organisms/sheet'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { SegmentedControl } from '@/components/features/accounts/create/SegmentedControl'
import type { TxnType } from '@/lib/transaction-form'

const ADD_TYPE_VALUES: TxnType[] = ['EXPENSE', 'INCOME', 'TRANSFER']

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
  /** Create a new category of the chosen `addType`; resolves to the new id (or null on failure). */
  onAddCategory?: (name: string, addType: TxnType) => Promise<string | null>
  isAdding?: boolean
}

export function CategoryPickerSheet({
  open,
  type,
  categories,
  selectedId,
  onSelect,
  onOpenChange,
  onAddCategory,
  isAdding = false,
}: CategoryPickerSheetProps) {
  const t = useTranslations('transactions.form')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'list' | 'add'>('list')
  const [newName, setNewName] = useState('')
  // Type for the new category — defaults to the transaction's type but is editable.
  const [newType, setNewType] = useState<TxnType>(type)

  // Reset transient UI state whenever the sheet closes.
  useEffect(() => {
    if (!open) {
      setSearch('')
      setMode('list')
      setNewName('')
      setNewType(type)
    }
  }, [open, type])

  const filtered = categories
    .filter((c) => c.group_type === type)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  const handleSelect = (id: string) => {
    onSelect(id)
    onOpenChange(false)
  }

  const openAdd = () => {
    // Pre-fill with the current search term so "search → not found → add" flows naturally,
    // and default the new category's type to the transaction's current type.
    setNewName(search.trim())
    setNewType(type)
    setMode('add')
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || !onAddCategory || isAdding) return
    const id = await onAddCategory(name, newType)
    if (!id) return
    // Only auto-select when the new category matches the type being picked for;
    // a category created for another type can't apply to this transaction, so
    // just close the sheet (it's saved and available when that type is active).
    if (newType === type) {
      handleSelect(id)
    } else {
      onOpenChange(false)
    }
  }

  const typeOptions = ADD_TYPE_VALUES.map((v) => ({
    value: v,
    label: t(v === 'EXPENSE' ? 'expense' : v === 'INCOME' ? 'income' : 'transfer'),
  }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {mode === 'add' && (
              <button
                type="button"
                onClick={() => setMode('list')}
                aria-label={t('back')}
                className="-ml-1 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            {mode === 'add' ? t('newCategoryTitle') : t('categorySheetTitle')}
          </SheetTitle>
          <SheetDescription className="sr-only">{t('categorySheetDescription')}</SheetDescription>
        </SheetHeader>

        {mode === 'list' ? (
          <>
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
              {filtered.length === 0 && (
                <p className="px-2 py-3 text-sm leading-body-sm text-muted-foreground">
                  {t('noCategoriesForType')}
                </p>
              )}
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

                {/* Add-new tile (only when the parent supports creation) */}
                {onAddCategory && (
                  <button
                    type="button"
                    onClick={openAdd}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg p-2',
                      'hover:bg-muted/50 active:bg-muted transition-colors',
                    )}
                  >
                    <span className="flex size-11 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                      <Plus className="size-5" />
                    </span>
                    <span className="text-nano leading-caption text-center text-muted-foreground line-clamp-2 w-full">
                      {t('addNewCategory')}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Add-category form */
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            {/* Live icon preview (auto-assigned icon/tint, derived from the name) */}
            <div className="flex flex-col items-center gap-2 py-2">
              {(() => {
                const PreviewIcon = getCategoryIcon(newName || 'tag')
                const previewTint = getCategoryTint(newName || 'tag')
                return (
                  <span
                    className={cn(
                      'flex size-16 items-center justify-center rounded-full',
                      previewTint.bg,
                    )}
                  >
                    <PreviewIcon className={cn('size-7', previewTint.fg)} />
                  </span>
                )
              })()}
            </div>

            {/* Type selector — which bucket the category belongs to */}
            <div className="mt-2">
              <span className="mb-1.5 block text-sm leading-body-sm text-muted-foreground">
                {t('categoryTypeLabel')}
              </span>
              <SegmentedControl<TxnType>
                options={typeOptions}
                value={newType}
                onChange={setNewType}
              />
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm leading-body-sm text-muted-foreground">
                {t('categoryNameLabel')}
              </span>
              <input
                type="text"
                autoFocus
                value={newName}
                placeholder={t('categoryNamePlaceholder')}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
                className={cn(
                  'h-[52px] w-full rounded-md border border-input bg-transparent px-3',
                  'text-md leading-body-sm text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                )}
              />
            </label>

            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || isAdding}
              className={cn(
                'mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl',
                'bg-primary text-md leading-body-lg font-medium text-primary-foreground',
                'transition-colors hover:bg-primary/90 active:bg-primary/80',
                'disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              {isAdding ? (
                t('adding')
              ) : (
                <>
                  <Check className="size-4" />
                  {t('addCategoryCta')}
                </>
              )}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
