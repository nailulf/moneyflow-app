'use client'

import { useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, MoreHorizontal } from 'lucide-react'
import { useHoldings } from '@/hooks/useHoldings'
import { useInvestmentTransactions } from '@/hooks/useInvestmentTransactions'
import { deleteHolding } from '@/lib/api/holdings'
import type { AssetClass } from '@/lib/portfolio-utils'
import { AssetDetailHero } from '@/components/features/portfolio/AssetDetailHero'
import { AssetPositionStats } from '@/components/features/portfolio/AssetPositionStats'
import { TransactionHistoryList } from '@/components/features/portfolio/TransactionHistoryList'
import { AssetManageSheet } from '@/components/features/portfolio/AssetManageSheet'
import { BuySheet } from '@/components/features/portfolio/BuySheet'
import { cn } from '@/lib/utils'

const PERIODS = ['1W', '1M', '3M', '6M', '1Y'] as const
type Period = (typeof PERIODS)[number]

/** Asset-detail page — route /portfolio/[accountId]/[holdingId]. */
export default function AssetDetailPage() {
  const t = useTranslations('portfolio')
  const router = useRouter()
  const queryClient = useQueryClient()
  const { accountId, holdingId } = useParams<{ accountId: string; holdingId: string }>()

  const { data: holdings = [], isLoading } = useHoldings(accountId)
  const holding = holdings.find((h) => h.id === holdingId)

  const { data: transactions = [], isLoading: txnLoading } = useInvestmentTransactions(accountId, holdingId)

  const [activePeriod, setActivePeriod] = useState<Period>('1M')
  const [manageOpen, setManageOpen] = useState(false)
  const [buyOpen, setBuyOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)

  // Ref for the transaction history section — used by onViewTransactions to scroll into view
  const historyRef = useRef<HTMLDivElement>(null)

  const handleViewTransactions = () => {
    setManageOpen(false)
    // Give the sheet time to dismiss before scrolling
    requestAnimationFrame(() => {
      historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['holdings', accountId] })
    await queryClient.invalidateQueries({ queryKey: ['all-holdings'] })
    await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    await queryClient.invalidateQueries({ queryKey: ['net-worth'] })
    await queryClient.invalidateQueries({ queryKey: ['investment-transactions', accountId, holdingId] })
  }

  const handleRemove = async () => {
    setDeletePending(true)
    try {
      await deleteHolding(accountId, holdingId)
      await refresh()
      router.push(`/portfolio/${accountId}`)
    } finally {
      setDeletePending(false)
    }
  }

  // Loading state — show centered spinner while holdings fetch
  if (isLoading && !holding) {
    return (
      <div className="mx-auto flex w-full max-w-md items-center justify-center pt-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    )
  }

  // Not-found state after data loads
  if (!isLoading && !holding) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 pt-3 pb-10 md:pt-8">
        <header className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/portfolio/${accountId}`)}
            aria-label={t('detail.back')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" aria-hidden="true" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg leading-body-lg font-bold text-foreground">
            {t('detail.back')}
          </h1>
        </header>
        <div className="rounded-2xl bg-card p-6 text-center shadow-card">
          <p className="text-sm leading-body-sm text-muted-foreground">{t('detail.emptyTitle')}</p>
        </div>
      </div>
    )
  }

  const currency = holding?.currency ?? 'IDR'
  const assetClass = (holding?.asset_class ?? 'OTHER') as AssetClass

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pt-3 pb-10 md:pt-8">
      {/* Header: back + symbol/class + manage trigger */}
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push(`/portfolio/${accountId}`)}
          aria-label={t('detail.back')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" aria-hidden="true" />
        </button>

        <span className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-lg leading-body-lg font-bold text-foreground">
            {holding?.symbol ?? holding?.name ?? '…'}
          </h1>
          <span className="truncate text-tiny text-muted-foreground">{t(`class.${assetClass}` as Parameters<typeof t>[0])}</span>
        </span>

        {/* "…" manage trigger — opens the AssetManageSheet */}
        <button
          type="button"
          aria-label="Manage asset"
          onClick={() => setManageOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
        >
          <MoreHorizontal className="h-4 w-4 text-foreground" aria-hidden="true" />
        </button>
      </header>

      {/* Value hero */}
      {holding && (
        <AssetDetailHero bookValue={holding.current_value} currency={currency} />
      )}

      {/* Period selector + chart placeholder */}
      <section className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-card shadow-card">
        {/* Period pills */}
        <div className="flex items-center gap-1 px-4 pt-4">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setActivePeriod(p)}
              className={cn(
                'flex-1 rounded-full py-1.5 text-tiny font-semibold leading-none transition-colors',
                p === activePeriod
                  ? 'bg-selected text-selected-foreground'
                  : 'text-muted-foreground hover:bg-muted/50',
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chart placeholder */}
        <div className="flex h-32 items-center justify-center px-4 pb-4">
          <p className="text-sm leading-body-sm text-muted-foreground">{t('assetDetail.chartPlaceholder')}</p>
        </div>
      </section>

      {/* Position stats */}
      {holding && <AssetPositionStats holding={holding} />}

      {/* Transaction history — ref for scroll-from-sheet */}
      <div ref={historyRef}>
        {!txnLoading && (
          <TransactionHistoryList transactions={transactions} currency={currency} assetClass={assetClass} />
        )}
      </div>

      {/* Sell / Buy More — Sell inert SP4; Buy More wired */}
      <div className="flex gap-3 pb-2">
        <button
          type="button"
          disabled
          className="flex-1 rounded-full border border-border py-3.5 text-sm leading-none font-semibold text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('assetDetail.sell')}
        </button>
        <button
          type="button"
          onClick={() => setBuyOpen(true)}
          className="flex-1 rounded-full bg-primary py-3.5 text-sm leading-none font-semibold text-primary-foreground"
        >
          {t('assetDetail.buyMore')}
        </button>
      </div>

      {/* Asset manage sheet */}
      {holding && (
        <AssetManageSheet
          open={manageOpen}
          holding={holding}
          pending={deletePending}
          onClose={() => setManageOpen(false)}
          onViewTransactions={handleViewTransactions}
          onRemove={handleRemove}
          onBuy={() => { setManageOpen(false); setBuyOpen(true) }}
        />
      )}

      {/* Buy sheet */}
      {holding && (
        <BuySheet
          open={buyOpen}
          holding={holding}
          accountId={accountId}
          onClose={() => setBuyOpen(false)}
          onDone={() => { setBuyOpen(false); refresh() }}
        />
      )}
    </div>
  )
}
