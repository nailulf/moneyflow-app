'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { useAllGoals } from '@/hooks/useGoalsQuery'
import { GoalCardMini } from '@/components/features/goals/GoalCardMini'
import { AddGoalSheet } from '@/components/features/goals/AddGoalSheet'

/**
 * Home "Target Tabungan" section — horizontally-scrolling mini goal cards
 * across every eligible account, plus a "+ Tambah" affordance that opens the
 * account-picking AddGoalSheet. Header "Lihat Semua" → /goals; tapping a card
 * → /goals/[id]; creating a goal → /goals/[newId].
 */
export function HomeGoalsSection() {
  const t = useTranslations('goals')
  const router = useRouter()
  const { data } = useAllGoals()
  const [sheetOpen, setSheetOpen] = useState(false)

  const items = data?.items ?? []

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-md leading-body-lg font-bold text-foreground">{t('sectionTitle')}</h2>
        <button
          type="button"
          onClick={() => router.push('/goals')}
          className="text-sm leading-body-sm text-primary"
        >
          {t('seeAll')}
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <GoalCardMini
            key={item.goal.id}
            item={item}
            currency={item.account.currency}
            onClick={() => router.push('/goals/' + item.goal.id)}
          />
        ))}

        {/* + Tambah affordance */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-[150px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-3.5 text-center text-primary transition-colors hover:bg-muted/30"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-selected">
            <Plus className="h-[18px] w-[18px] text-selected-foreground" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold leading-body-sm">{t('add')}</span>
        </button>
      </div>

      <AddGoalSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={(goalId) => router.push('/goals/' + goalId)}
      />
    </section>
  )
}
