'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Target } from 'lucide-react'
import { useAllGoals } from '@/hooks/useGoalsQuery'
import { GoalCardCompact } from '@/components/features/goals/GoalCardCompact'
import { AddGoalSheet } from '@/components/features/goals/AddGoalSheet'
import { StickyScreenHeader } from '@/components/features/navigation/StickyScreenHeader'
import { formatCurrency } from '@/lib/data-utils'

/**
 * `/goals` list screen — a navy "Total Terkumpul" hero (aggregate saved across
 * every eligible account) above a vertical column of `GoalCardCompact`. Reached
 * from Home "Lihat Semua" and the Account screen; keeps the bottom nav. Tapping
 * a card → /goals/[id]; "+ Tambah" opens the account-picking AddGoalSheet, and
 * creating a goal → /goals/[newId].
 */
export function GoalsListScreen() {
  const t = useTranslations('goals')
  const router = useRouter()
  const { data } = useAllGoals()
  const [sheetOpen, setSheetOpen] = useState(false)

  const items = data?.items ?? []
  const totalSaved = data?.totalSaved ?? 0
  const totalTarget = data?.totalTarget ?? 0
  const activeCount = data?.activeCount ?? 0
  const currency = items[0]?.account.currency ?? 'IDR'

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pt-3 md:max-w-2xl">
      <StickyScreenHeader>
        <h1 className="text-2xl leading-title-3 font-bold text-foreground">{t('sectionTitle')}</h1>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-selected px-3.5 py-1.5 text-sm font-semibold leading-body-sm text-selected-foreground transition-colors hover:bg-selected/70"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('add')}
        </button>
      </StickyScreenHeader>

      {/* Total Terkumpul hero */}
      <section className="rounded-[20px] bg-hero-gradient p-5 text-hero-foreground">
        <p className="text-xs leading-caption text-hero-muted">{t('list.totalTitle')}</p>
        <p className="mt-1 text-3xl font-bold leading-title-2 text-hero-foreground">
          {formatCurrency(totalSaved, currency)}
        </p>
        <p className="mt-2 text-sm leading-body-sm text-hero-muted">
          {formatCurrency(totalTarget, currency)} · {t('list.activeCount', { count: activeCount })}
        </p>
      </section>

      {items.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-2xl bg-card px-6 py-10 text-center shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-selected">
            <Target className="h-6 w-6 text-selected-foreground" aria-hidden="true" />
          </span>
          <p className="text-md leading-body-lg text-muted-foreground">{t('list.empty')}</p>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold leading-body-sm text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('list.emptyCta')}
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <GoalCardCompact
              key={item.goal.id}
              item={item}
              currency={item.account.currency}
              onClick={() => router.push('/goals/' + item.goal.id)}
            />
          ))}
        </div>
      )}

      <AddGoalSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={(goalId) => router.push('/goals/' + goalId)}
      />
    </div>
  )
}
