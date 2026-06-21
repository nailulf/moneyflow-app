'use client'

import { useTranslations } from 'next-intl'
import {
  TrendingDown,
  TrendingUp,
  Pencil,
  Receipt,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/organisms/sheet'
import { formatCurrency } from '@/lib/data-utils'
import { cn } from '@/lib/utils'
import type { Holding } from '@/lib/api/holdings'
import { assetPositionView } from '@/lib/portfolio-screen-utils'

interface AssetManageSheetProps {
  open: boolean
  holding: Holding
  pending: boolean
  onClose: () => void
  onViewTransactions: () => void
  onRemove: () => void
  onBuy?: () => void
  onSell?: () => void
}

interface MenuRowProps {
  icon: LucideIcon
  iconBg: string
  iconFg: string
  title: string
  sub: string
  onClick?: () => void
  disabled?: boolean
  destructive?: boolean
  pending?: boolean
}

function MenuRow({ icon: Icon, iconBg, iconFg, title, sub, onClick, disabled, destructive, pending }: MenuRowProps) {
  return (
    <button
      type="button"
      aria-label={title}
      onClick={onClick}
      disabled={disabled || pending}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-card transition-opacity',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconBg)}>
        <Icon className={cn('h-5 w-5', iconFg)} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-sm leading-body-sm font-semibold', destructive ? 'text-destructive' : 'text-foreground')}>
          {title}
        </span>
        <span className="text-tiny leading-caption text-muted-foreground">{sub}</span>
      </span>
    </button>
  )
}

/**
 * Asset manage sheet — the "…" bottom-sheet menu on the asset-detail screen.
 * Buy more / Sell / Edit purchase info are inert (SP3).
 * View transactions and Remove are wired.
 *
 * Design: manage-sheet frame (BBCA action sheet) in designs/spending-page.pen.
 */
export function AssetManageSheet({ open, holding, pending, onClose, onViewTransactions, onRemove, onBuy, onSell }: AssetManageSheetProps) {
  const t = useTranslations('portfolio')

  const close = () => onClose()

  const view = assetPositionView({
    asset_class: holding.asset_class as Parameters<typeof assetPositionView>[0]['asset_class'],
    quantity: holding.quantity,
    purchase_price: holding.purchase_price,
    current_value: holding.current_value,
    currency: holding.currency ?? 'IDR',
  })

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          {/* Header — asset identity */}
          <div>
            <SheetTitle className="text-md leading-body-lg font-bold text-foreground">
              {holding.symbol ? `${holding.symbol} — ${holding.name}` : holding.name}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-tiny text-muted-foreground">
              {view.quantityLabel} · {formatCurrency(holding.current_value, holding.currency ?? 'IDR')}
            </SheetDescription>
          </div>

          {/* Menu rows */}
          <div className="flex flex-col gap-2">
            {/* Buy more */}
            <MenuRow
              icon={TrendingUp}
              iconBg="bg-tint-green-bg"
              iconFg="text-tint-green-fg"
              title={t('manage.buyMore')}
              sub={t('manage.buyMoreSub')}
              onClick={onBuy}
            />

            {/* Sell / reduce */}
            <MenuRow
              icon={TrendingDown}
              iconBg="bg-tint-orange-bg"
              iconFg="text-tint-orange-fg"
              title={t('manage.sell')}
              sub={t('manage.sellSub')}
              onClick={onSell}
            />

            {/* Edit purchase info — inert SP3 */}
            <MenuRow
              icon={Pencil}
              iconBg="bg-tint-blue-bg"
              iconFg="text-tint-blue-fg"
              title={t('manage.editPurchase')}
              sub={t('manage.editPurchaseSub')}
              disabled
            />

            {/* View transactions — wired */}
            <MenuRow
              icon={Receipt}
              iconBg="bg-tint-teal-bg"
              iconFg="text-tint-teal-fg"
              title={t('manage.viewTransactions')}
              sub={t('manage.viewTransactionsSub')}
              onClick={onViewTransactions}
            />

            {/* Remove — destructive, wired */}
            <MenuRow
              icon={Trash2}
              iconBg="bg-destructive/10"
              iconFg="text-destructive"
              title={t('manage.remove')}
              sub={t('manage.removeSub')}
              onClick={onRemove}
              pending={pending}
              destructive
            />
          </div>

          {/* Cancel */}
          <button
            type="button"
            onClick={close}
            className="h-[52px] w-full rounded-[14px] bg-muted text-md leading-body-lg font-semibold text-foreground"
          >
            {t('manage.cancel')}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
