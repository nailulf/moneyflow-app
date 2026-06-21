'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Layers, Tag, Calendar } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/organisms/sheet'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FormCard, FormRow } from '@/components/features/accounts/create/FormCard'
import { updateTransaction, deleteTransaction } from '@/lib/api/investment-transactions'
import { baseToLotsOrUnits, lotsOrUnitsToBase, estimatedTotal } from '@/lib/portfolio-trade-form'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'
import type { Holding } from '@/lib/api/holdings'
import type { InvestmentTxn } from '@/lib/api/investment-transactions'
import type { AssetClass } from '@/lib/portfolio-utils'

interface EditRecordSheetProps {
  open: boolean
  txn: InvestmentTxn
  holding: Holding
  accountId: string
  onClose: () => void
  onDone: () => void
}

/**
 * EditRecordSheet — pre-filled edit/delete sheet for an existing investment transaction.
 * Opened from a tappable TransactionHistoryList row or from AssetManageSheet "Edit purchase info".
 */
export function EditRecordSheet({ open, txn, holding, accountId, onClose, onDone }: EditRecordSheetProps) {
  const t = useTranslations('portfolio')

  const assetClass = holding.asset_class as AssetClass
  const isIdx = assetClass === 'IDX_STOCK'
  const unitLabel = isIdx ? t('trade.lots') : t('trade.units')

  const [qty, setQty] = useState<number>(() => baseToLotsOrUnits(txn.quantity, assetClass))
  const [price, setPrice] = useState<number>(() => txn.price_per_unit ?? 0)
  const [date, setDate] = useState<string>(() => txn.transaction_date)
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Re-sync when txn changes (e.g. opening a different row)
  useEffect(() => {
    setQty(baseToLotsOrUnits(txn.quantity, assetClass))
    setPrice(txn.price_per_unit ?? 0)
    setDate(txn.transaction_date)
    setConfirmDelete(false)
  }, [txn.id, txn.quantity, txn.price_per_unit, txn.transaction_date, assetClass])

  const baseQty = lotsOrUnitsToBase(qty, assetClass)
  const total = estimatedTotal(baseQty, price)
  const canSubmit = qty > 0 && price > 0

  const typeLabel = txn.type === 'BUY' ? t('history.buy') : txn.type === 'SELL' ? t('history.sell') : t('history.dividend')

  const handleClose = () => {
    if (!pending) {
      setConfirmDelete(false)
      onClose()
    }
  }

  const handleDeleteClick = () => {
    if (pending) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    void handleDelete()
  }

  const handleSave = async () => {
    if (!canSubmit || pending) return
    setPending(true)
    try {
      await updateTransaction(accountId, holding.id, txn.id, {
        quantity: baseQty,
        price_per_unit: price,
        transaction_date: date,
      })
      onDone()
    } catch {
      toast.error(t('trade.editError'))
    } finally {
      setPending(false)
    }
  }

  const handleDelete = async () => {
    if (pending) return
    setPending(true)
    try {
      await deleteTransaction(accountId, holding.id, txn.id)
      onDone()
    } catch {
      toast.error(t('trade.deleteError'))
    } finally {
      setPending(false)
    }
  }

  const priceLabel = isIdx ? t('trade.priceShareLabel') : t('trade.priceUnitLabel')

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          {/* Header */}
          <div>
            <SheetTitle className="text-md leading-body-lg font-bold text-foreground">
              {t('trade.editTitle')}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-tiny text-muted-foreground">
              {holding.symbol ? `${holding.symbol} — ${holding.name}` : holding.name}
            </SheetDescription>
          </div>

          {/* Type read-only badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm leading-body-sm text-muted-foreground">{typeLabel}</span>
          </div>

          {/* Form card */}
          <FormCard>
            {/* Lots / units row */}
            <FormRow icon={Layers}>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">
                  {t('trade.quantityLabel')} ({unitLabel})
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    data-testid="trade-qty"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="any"
                    value={qty === 0 ? '' : qty}
                    onChange={(e) => setQty(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                  {isIdx && qty > 0 && (
                    <span className="shrink-0 text-tiny text-muted-foreground">
                      {t('trade.sharesHint', { shares: lotsOrUnitsToBase(qty, assetClass) })}
                    </span>
                  )}
                </div>
              </div>
            </FormRow>

            {/* Price row */}
            <FormRow icon={Tag}>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">
                  {priceLabel}
                </span>
                <CurrencyInput
                  data-testid="trade-price"
                  value={price}
                  onChange={setPrice}
                  currency={holding.currency ?? 'IDR'}
                  placeholder="0"
                  className="w-36 border-none bg-transparent pl-8 text-right text-sm leading-body-sm font-semibold text-foreground shadow-none focus-visible:ring-0"
                />
              </div>
            </FormRow>

            {/* Date row */}
            <FormRow icon={Calendar}>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">
                  {t('trade.dateLabel')}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
                />
              </div>
            </FormRow>
          </FormCard>

          {/* Estimated total card + breakdown */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-card">
              <span className="text-sm leading-body-sm text-muted-foreground">{t('trade.estimatedTotal')}</span>
              <span className="text-md leading-body-lg font-bold text-foreground">
                {formatCurrency(total, holding.currency ?? 'IDR')}
              </span>
            </div>
            {qty > 0 && price > 0 && (
              <p className="px-1 text-tiny leading-caption text-muted-foreground">
                {isIdx
                  ? t('trade.estimateBreakdownLots', { lots: qty, price: formatCurrency(price, holding.currency ?? 'IDR') })
                  : t('trade.estimateBreakdownUnits', { units: qty, price: formatCurrency(price, holding.currency ?? 'IDR') })}
              </p>
            )}
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSubmit || pending}
            className={cn(
              'h-[52px] w-full rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground',
              'transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {pending ? t('trade.saving') : t('trade.save')}
          </button>

          {/* Delete button — requires a confirm step */}
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={pending}
            className={cn(
              'h-[52px] w-full rounded-[14px] text-md leading-body-lg font-semibold',
              'transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
              confirmDelete
                ? 'bg-destructive text-destructive-foreground'
                : 'border border-destructive/30 bg-destructive/10 text-destructive',
            )}
          >
            {confirmDelete ? t('trade.confirmDeleteRecord') : t('trade.delete')}
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="h-[52px] w-full rounded-[14px] bg-muted text-md leading-body-lg font-semibold text-foreground disabled:opacity-50"
          >
            {t('manage.cancel')}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
