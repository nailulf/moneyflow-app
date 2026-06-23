'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Target } from 'lucide-react'
import { useAccountGoals } from '@/hooks/useGoalsQuery'
import { canHaveGoal } from '@/lib/goals/eligibility'
import { GoalCardMini } from '@/components/features/goals/GoalCardMini'
import { AddGoalSheet } from '@/components/features/goals/AddGoalSheet'
import type { AccountWithHistory } from '@/contexts/AccountContext'

export function AccountGoalsSection({ account }: { account: AccountWithHistory }) {
  const t = useTranslations('goals')
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)

  const { data } = useAccountGoals(account.id)
  const goals = data ?? []

  if (!canHaveGoal(account.type)) return null

  const openGoal = (goalId: string) => router.push('/goals/' + goalId)

  return (
    <section className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg leading-title-5 font-semibold text-foreground">
          {t('sectionTitle')}
        </h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex h-9 items-center gap-1 rounded-full bg-card px-3 text-sm font-medium text-primary shadow-card transition-colors hover:bg-muted/50"
        >
          <Plus className="size-4" />
          {t('add')}
        </button>
      </div>

      {goals.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto px-2 pb-1">
          {goals.map((item) => (
            <GoalCardMini
              key={item.goal.id}
              item={item}
              currency={account.currency}
              onClick={() => openGoal(item.goal.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 text-center shadow-card">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Target className="size-6 text-muted-foreground" />
          </span>
          <p className="text-md font-semibold leading-body-sm text-foreground">
            {t('empty.title')}
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-[44px] items-center justify-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('empty.cta')}
          </button>
        </div>
      )}

      <AddGoalSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        accountId={account.id}
        onCreated={(goalId) => {
          if (goalId) router.push('/goals/' + goalId)
        }}
      />
    </section>
  )
}
