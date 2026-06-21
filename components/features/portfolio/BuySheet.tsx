'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Layers, Tag, Calendar } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/organisms/sheet'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { FormCard, FormRow } from '@/components/features/accounts/create/FormCard'
import { addTransaction } from '@/lib/api/investment-transactions'
import { tradeFormToPayload, estimatedTotal, lotsOrUnitsToBase } from '@/lib/portfolio-trade-form'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'
import type { Holding } from '@/lib/api/holdings'
import type { AssetClass } from '@/lib/portfolio-utils'

interface BuySheetProps {
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
 * BuySheet — records an additional purchase of an existing holding.
 * Opened from the asset-detail page (Buy More button) and from AssetManageSheet.
 */
export function BuySheet({ open, holding, accountId, onClose, onDone }: BuySheetProps) {
  const t = useTranslations('portfolio')

  const [qty, setQty] = useState(0)
  const [price, setPrice] = useState(0)
  const [date, setDate] = useState(todayIso)
  const [pending, setPending] = useState(false)

  const assetClass = holding.asset_class as AssetClass
  const isIdx = assetClass === 'IDX_STOCK'
  const unitLabel = isIdx ? t('trade.lots') : t('trade.units')

  const baseQty = lotsOrUnitsToBase(qty, assetClass)
  const total = estimatedTotal(baseQty, price)
  const canSubmit = qty > 0 && price > 0

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
      await addTransaction(accountId, holding.id, { type: 'BUY', ...payload })
      onDone()
    } catch {
      toast.error(t('trade.buyError'))
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
              {t('trade.buyTitle')}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-tiny text-muted-foreground">
              {holding.symbol ? `${holding.symbol} — ${holding.name}` : holding.name}
            </SheetDescription>
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

          {/* Confirm button */}
          <button
            type="button"
            aria-label={t('trade.confirmBuy')}
            onClick={handleSubmit}
            disabled={!canSubmit || pending}
            className={cn(
              'h-[52px] w-full rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground',
              'transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {pending ? t('trade.saving') : t('trade.confirmBuy')}
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
