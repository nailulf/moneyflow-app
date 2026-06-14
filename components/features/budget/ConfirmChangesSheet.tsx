'use client'

import { useTranslations } from 'next-intl'
import { TriangleAlert, ArrowRight } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/organisms/sheet'
import { formatCurrencyCompact } from '@/lib/data-utils'
import type { PlanDiffRow } from '@/lib/budget-screen-utils'

interface ConfirmChangesSheetProps {
  open: boolean
  diff: PlanDiffRow[]
  currency: string
  pending: boolean
  onApply: () => void
  onCancel: () => void
}

/** "Apply changes to budget?" confirm sheet (design `WQDjZ`). */
export function ConfirmChangesSheet({ open, diff, currency, pending, onApply, onCancel }: ConfirmChangesSheetProps) {
  const t = useTranslations('budgetCreate')
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-tint-amber-bg">
            <TriangleAlert className="h-5 w-5 text-tint-amber-fg" aria-hidden="true" />
          </span>
          <SheetTitle className="text-center text-md leading-body-lg font-bold text-foreground">
            {t('confirm.title')}
          </SheetTitle>
          <ul className="divide-y divide-muted rounded-2xl bg-muted/40 px-4">
            {diff.map((row) => (
              <li key={row.categoryId} className="flex items-center justify-between gap-2 py-2.5 text-sm leading-body-sm">
                <span className="min-w-0 truncate font-medium text-foreground">{row.name}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="text-muted-foreground">{formatCurrencyCompact(row.from, currency)}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  <span className={row.to >= row.from ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                    {formatCurrencyCompact(row.to, currency)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <SheetDescription className="rounded-xl bg-tint-amber-bg p-3 text-xs leading-caption text-tint-amber-fg">{t('confirm.effect')}</SheetDescription>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel}
              className="h-[52px] flex-1 rounded-[14px] bg-muted text-md leading-body-lg font-semibold text-foreground">
              {t('confirm.cancel')}
            </button>
            <button type="button" onClick={onApply} disabled={pending}
              className="h-[52px] flex-1 rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground disabled:opacity-60">
              {t('confirm.apply')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
