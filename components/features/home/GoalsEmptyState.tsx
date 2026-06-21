'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Target } from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { useGoalsSummary } from '@/hooks/useGoalsQuery'
import { AddGoalModal } from '@/components/features/goals/AddGoalModal'
import { AccountPickerSheet, type PickerAccount } from '@/components/features/transaction/form/AccountPickerSheet'
import { HomeEmptyState } from './HomeEmptyState'

// Goals attach to a savings-capable account (mirrors AccountDetailView's canHaveGoal).
const GOAL_ACCOUNT_TYPES = ['BANK', 'INVESTMENT']

/**
 * Empty Financial-Goals card + its create flow: tapping the CTA opens an
 * account picker (goals are per-account, one per account), then the existing
 * Add-Goal form for the chosen account. With no eligible account, it routes to
 * add one first.
 */
export function GoalsEmptyState() {
  const t = useTranslations('home')
  const router = useRouter()
  const { accounts } = useAccounts()
  const { data: goalsSummary } = useGoalsSummary()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // One goal per account — exclude accounts that already have one.
  const withGoal = new Set((goalsSummary?.goals ?? []).map((g) => g.accountId))
  const eligible = accounts.filter((a) => GOAL_ACCOUNT_TYPES.includes(a.type) && !withGoal.has(a.id))
  const pickerAccounts: PickerAccount[] = eligible.map((a) => ({
    id: a.id, name: a.name, type: a.type, balance: a.balance, currency: a.currency,
  }))
  const selectedAccount = eligible.find((a) => a.id === selectedId) ?? null

  const handleCta = () => {
    if (eligible.length === 0) {
      router.push('/accounts/new')
      return
    }
    setPickerOpen(true)
  }

  return (
    <>
      <HomeEmptyState
        variant="inline"
        icon={Target}
        bubbleClassName="bg-tint-green-bg"
        iconClassName="text-tint-green-fg"
        title={t('goals.emptyTitle')}
        description={t('goals.emptyHint')}
        cta={{ label: t('goals.setGoal'), onClick: handleCta }}
      />
      <AccountPickerSheet
        open={pickerOpen}
        title={t('goals.pickAccountTitle')}
        accounts={pickerAccounts}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onOpenChange={setPickerOpen}
      />
      {selectedAccount && (
        <AddGoalModal
          account={selectedAccount}
          isOpen={!!selectedAccount}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
