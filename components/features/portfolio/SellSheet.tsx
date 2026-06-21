'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Layers, Tag, Calendar } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/organisms/sheet'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { Switch } from '@/components/ui/atoms/switch'
import { FormCard, FormRow } from '@/components/features/accounts/create/FormCard'
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

  const priceLabel = isIdx ? t('trade.priceShareLabel') : t('trade.priceUnitLabel')

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

          {/* Form card */}
          <FormCard>
            {/* Lots / units row */}
            <FormRow icon={Layers} error={oversell ? t('trade.youHold', { qty: `${heldDisplayQty} ${unitLabel}` }) : undefined}>
              <div className="flex w-full items-center justify-between gap-2">
                <span className={cn('shrink-0 text-sm leading-body-sm text-muted-foreground', oversell && 'text-destructive')}>
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
                    className={cn(
                      'w-20 bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/60',
                      oversell && 'text-destructive',
                    )}
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

          {/* Proceeds card + breakdown */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-card">
              <span className="text-sm leading-body-sm text-muted-foreground">{t('trade.proceeds')}</span>
              <span className="text-md leading-body-lg font-bold text-foreground">
                {formatCurrency(proceeds, holding.currency ?? 'IDR')}
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
