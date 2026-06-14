'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/organisms/sheet'
import { formatCurrency } from '@/lib/data-utils'
import type { Holding } from '@/lib/api/holdings'
import type { SanitizedHolding } from '@/lib/portfolio-utils'

interface HoldingManageSheetProps {
  open: boolean
  holding: Holding
  pending: boolean
  onClose: () => void
  onSave: (patch: Partial<SanitizedHolding>) => void
  onDelete: () => void
}

/** Manage-asset sheet (design `I2Nls`, simplified: Edit + Remove; Buy/Sell/Txns deferred). */
export function HoldingManageSheet({ open, holding, pending, onClose, onSave, onDelete }: HoldingManageSheetProps) {
  const t = useTranslations('portfolio')
  const [mode, setMode] = useState<'menu' | 'edit' | 'confirm'>('menu')
  const [value, setValue] = useState(String(holding.current_value))

  const reset = () => { setMode('menu'); setValue(String(holding.current_value)) }
  const close = () => { reset(); onClose() }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <div>
            <SheetTitle className="text-md leading-body-lg font-bold text-foreground">{holding.name}</SheetTitle>
            <SheetDescription className="text-tiny text-muted-foreground">
              {formatCurrency(holding.current_value, holding.currency)}
            </SheetDescription>
          </div>

          {mode === 'menu' && (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setMode('edit')}
                className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-card">
                <Pencil className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-sm leading-body-sm font-semibold text-foreground">{t('manage.edit')}</span>
              </button>
              <button type="button" onClick={() => setMode('confirm')}
                className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-card">
                <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                <span className="text-sm leading-body-sm font-semibold text-destructive">{t('manage.remove')}</span>
              </button>
            </div>
          )}

          {mode === 'edit' && (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-tiny font-semibold text-muted-foreground">{t('manage.currentValue')}</span>
                <input type="number" inputMode="numeric" min="0" aria-label={t('manage.currentValue')}
                  value={value} onChange={(e) => setValue(e.target.value)}
                  className="h-[52px] rounded-[14px] bg-card px-4 text-sm leading-body-sm font-semibold text-foreground shadow-card outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={reset} className="h-[52px] flex-1 rounded-[14px] bg-muted text-md leading-body-lg font-semibold text-foreground">{t('manage.cancel')}</button>
                <button type="button" disabled={pending} onClick={() => onSave({ current_value: Number(value) || 0 })}
                  className="h-[52px] flex-1 rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground disabled:opacity-60">{t('manage.save')}</button>
              </div>
            </div>
          )}

          {mode === 'confirm' && (
            <div className="flex flex-col gap-3">
              <p className="rounded-xl bg-destructive/10 p-3 text-xs leading-caption text-destructive">{t('manage.removeWarning')}</p>
              <div className="flex gap-2">
                <button type="button" onClick={reset} className="h-[52px] flex-1 rounded-[14px] bg-muted text-md leading-body-lg font-semibold text-foreground">{t('manage.cancel')}</button>
                <button type="button" disabled={pending} onClick={onDelete}
                  className="h-[52px] flex-1 rounded-[14px] bg-destructive text-md leading-body-lg font-semibold text-destructive-foreground disabled:opacity-60">{t('manage.confirmRemove')}</button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
