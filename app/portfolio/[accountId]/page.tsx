'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { useAccounts } from '@/contexts/AccountContext'
import { useHoldings } from '@/hooks/useHoldings'
import { updateHolding, deleteHolding, type Holding } from '@/lib/api/holdings'
import { portfolioTotals, type SanitizedHolding } from '@/lib/portfolio-utils'
import { PortfolioValueHero } from '@/components/features/portfolio/PortfolioValueHero'
import { HoldingsByClassList } from '@/components/features/portfolio/HoldingsByClassList'
import { HoldingManageSheet } from '@/components/features/portfolio/HoldingManageSheet'

export default function AccountDetailPage() {
  const t = useTranslations('portfolio')
  const router = useRouter()
  const { accountId } = useParams<{ accountId: string }>()
  const queryClient = useQueryClient()
  const { accounts } = useAccounts()
  const { data: holdings = [], isLoading } = useHoldings(accountId)
  const [managed, setManaged] = useState<Holding | null>(null)
  const [pending, setPending] = useState(false)

  const account = accounts.find((a) => a.id === accountId)
  const totals = useMemo(() => portfolioTotals(holdings), [holdings])
  const currency = account?.currency ?? 'IDR'

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['holdings', accountId] })
    queryClient.invalidateQueries({ queryKey: ['all-holdings'] })
  }

  const handleSave = async (patch: Partial<SanitizedHolding>) => {
    if (!managed || pending) return
    setPending(true)
    try {
      await updateHolding(accountId, managed.id, patch)
      refresh(); setManaged(null)
    } catch { toast.error(t('manage.saveFailed')) } finally { setPending(false) }
  }

  const handleDelete = async () => {
    if (!managed || pending) return
    setPending(true)
    try {
      await deleteHolding(accountId, managed.id)
      refresh(); setManaged(null)
    } catch { toast.error(t('manage.deleteFailed')) } finally { setPending(false) }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pt-3 pb-10 md:pt-8">
      <header className="flex items-center gap-2">
        <button type="button" onClick={() => router.push('/portfolio')} aria-label={t('detail.back')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card shadow-card">
          <ArrowLeft className="h-4 w-4 text-foreground" aria-hidden="true" />
        </button>
        <span className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-body-lg font-bold text-foreground">{account?.name ?? ''}</h1>
          <span className="block truncate text-tiny text-muted-foreground">{account?.broker ?? t('detail.investmentAccount')}</span>
        </span>
        <button type="button" onClick={() => router.push(`/portfolio/${accountId}/add`)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm leading-none font-semibold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {t('detail.addAsset')}
        </button>
      </header>

      <PortfolioValueHero totalValue={totals.totalValue} totalGainLoss={totals.totalGainLoss}
        totalGainLossPct={totals.totalGainLossPct} assetCount={holdings.length} currency={currency} />

      {!isLoading && holdings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 text-center shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Layers className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="text-sm leading-body-sm font-bold text-foreground">{t('detail.emptyTitle')}</p>
          <p className="text-sm leading-body-sm text-muted-foreground">{t('detail.emptyDescription')}</p>
          <button type="button" onClick={() => router.push(`/portfolio/${accountId}/add`)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm leading-none font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('detail.addAsset')}
          </button>
        </div>
      ) : (
        <HoldingsByClassList holdings={holdings} onSelect={setManaged} />
      )}

      {managed && (
        <HoldingManageSheet open={!!managed} holding={managed} pending={pending}
          onClose={() => setManaged(null)} onSave={handleSave} onDelete={handleDelete} />
      )}
    </div>
  )
}
