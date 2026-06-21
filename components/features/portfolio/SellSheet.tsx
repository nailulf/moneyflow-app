'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/organisms/sheet'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { Switch } from '@/components/ui/atoms/switch'
import { addTransaction } from '@/lib/api/investment-transactions'
import {
  tradeFormToPayload,
  estimatedTotal,
  lotsOrUnitsToBase,
  baseToLotsOrUnits,
  canSell,
} from '@/lib/portfolio-trade-form'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'
import type { Holding } from '@/lib/api/holdings'
import type { AssetClass } from '@/lib/portfolio-utils'

interface SellSheetProps {
  open: boolean
  holding: Holding
  accountId: string
  onClose: () => void
  onDone: () => void
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * SellSheet — records a sell / reduce of an existing holding.
 * Opened from the asset-detail page (Sell button) and from AssetManageSheet.
 */
export function SellSheet({ open, holding, accountId, onClose, onDone }: SellSheetProps) {
  const t = useTranslations('portfolio')

  const [qty, setQty] = useState(0)
  const [price, setPrice] = useState(0)
  const [date, setDate] = useState(todayIso)
  const [keepAsCash, setKeepAsCash] = useState(false)
  const [pending, setPending] = useState(false)

  const assetClass = holding.asset_class as AssetClass
  const isIdx = assetClass === 'IDX_STOCK'
  const unitLabel = isIdx ? t('trade.lots') : t('trade.units')

  const baseQty = lotsOrUnitsToBase(qty, assetClass)
  const heldDisplayQty = baseToLotsOrUnits(holding.quantity, assetClass)
  const proceeds = estimatedTotal(baseQty, price)
  const oversell = qty > 0 && !canSell(baseQty, holding.quantity)
  const canSubmit = qty > 0 && price > 0 && !oversell

  const handleClose = () => {
    if (!pending) onClose()
  }

  const handleSubmit = async () => {
    if (!canSubmit || pending) return
    setPending(true)
    try {
      const payload = tradeFormToPayload(
        { quantity: qty, price_per_unit: price, transaction_date: date },
        assetClass,
      )
      await addTransaction(accountId, holding.id, {
        type: 'SELL',
        ...payload,
        proceeds_to_cash: keepAsCash,
      })
      onDone()
    } catch {
      toast.error(t('trade.sellError'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          {/* Header */}
          <div>
            <SheetTitle className="text-md leading-body-lg font-bold text-foreground">
              {t('trade.sellTitle')}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-tiny text-muted-foreground">
              {holding.symbol ? `${holding.symbol} — ${holding.name}` : holding.name}
            </SheetDescription>
          </div>

          {/* You hold */}
          <p className="text-sm leading-body-sm text-muted-foreground">
            {t('trade.youHold', { qty: `${heldDisplayQty} ${unitLabel}` })}
          </p>

          {/* Fields */}
          <div className="flex flex-col gap-3">
            {/* Quantity */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sell-qty" className="text-sm leading-body-sm font-medium text-foreground">
                {t('trade.quantityLabel')} ({unitLabel})
              </label>
              <input
                id="sell-qty"
                data-testid="trade-qty"
                type="number"
                inputMode="numeric"
                min="0"
                step="any"
                value={qty === 0 ? '' : qty}
                onChange={(e) => setQty(Number(e.target.value) || 0)}
                placeholder="0"
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1',
                  'text-md leading-body-sm shadow-xs transition-colors',
                  'placeholder:text-muted-foreground',
                  'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  oversell && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50',
                )}
              />
              {oversell && (
                <p className="text-tiny leading-caption text-destructive">
                  {t('trade.youHold', { qty: `${heldDisplayQty} ${unitLabel}` })}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sell-price" className="text-sm leading-body-sm font-medium text-foreground">
                {t('trade.priceLabel', { unit: unitLabel })}
              </label>
              <CurrencyInput
                id="sell-price"
                data-testid="trade-price"
                value={price}
                onChange={setPrice}
                currency={holding.currency ?? 'IDR'}
                placeholder="0"
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sell-date" className="text-sm leading-body-sm font-medium text-foreground">
                {t('trade.dateLabel')}
              </label>
              <input
                id="sell-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1',
                  'text-md leading-body-sm shadow-xs transition-colors',
                  'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                )}
              />
            </div>
          </div>

          {/* Proceeds total */}
          <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-card">
            <span className="text-sm leading-body-sm text-muted-foreground">{t('trade.proceeds')}</span>
            <span className="text-md leading-body-lg font-bold text-foreground">
              {formatCurrency(proceeds, holding.currency ?? 'IDR')}
            </span>
          </div>

          {/* Keep as cash toggle */}
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 shadow-card">
            <label
              htmlFor="keep-as-cash-switch"
              className="text-sm leading-body-sm font-medium text-foreground"
            >
              {t('trade.keepAsCash')}
            </label>
            <Switch
              id="keep-as-cash-switch"
              data-testid="keep-as-cash"
              checked={keepAsCash}
              onCheckedChange={setKeepAsCash}
            />
          </div>

          {/* Net worth note — shown when keep-as-cash is OFF */}
          {!keepAsCash && proceeds > 0 && (
            <p className="text-tiny leading-caption text-muted-foreground">
              {t('trade.netWorthNote', { amount: formatCurrency(proceeds, holding.currency ?? 'IDR') })}
            </p>
          )}

          {/* Confirm button */}
          <button
            type="button"
            aria-label={t('trade.confirmSell')}
            onClick={handleSubmit}
            disabled={!canSubmit || pending}
            className={cn(
              'h-[52px] w-full rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground',
              'transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {pending ? t('trade.saving') : t('trade.confirmSell')}
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
