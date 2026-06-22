'use client'

import { createElement, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowLeft, Pencil, Trash2, TrendingUp, Flame, Loader2, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGoal, useDeleteGoal } from '@/hooks/useGoalsQuery'
import { useAllTransactions } from '@/hooks/useTransactionsQuery'
import {
  monthlyInflowRate,
  projectCompletionDate,
  consistencyStreak,
  requiredMonthly,
} from '@/lib/goals/insights'
import { isGoalOnTrack, parseTargetDate } from '@/lib/goals/calculations'
import { goalIcon, goalTint } from '@/lib/goals/goal-style'
import { formatCurrency } from '@/lib/data-utils'
import { StickyScreenHeader } from '@/components/features/navigation/StickyScreenHeader'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/molecules/dialog'
import { Button } from '@/components/ui/atoms/button'
import { EditGoalSheet } from './EditGoalSheet'
import { cn } from '@/lib/utils'

// Months between two dates (whole calendar months, floored at 0).
function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

// "June 2027" style month label for a given locale.
function monthLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

interface InsightCardProps {
  Icon: LucideIcon
  tint: { bg: string; fg: string }
  title: string
  body: string
}

function InsightCard({ Icon, tint, title, body }: InsightCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', tint.bg)}>
        <Icon className={cn('size-5', tint.fg)} />
      </span>
      <div className="min-w-0">
        <h3 className="text-md leading-body-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm leading-body-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

export function GoalDetailScreen({ goalId }: { goalId: string }) {
  const t = useTranslations('goals')
  const locale = useLocale()
  const router = useRouter()
  const { user } = useAuth()

  const { data } = useGoal(goalId)
  const accountId = data?.account.id ?? ''
  const { transactions } = useAllTransactions({ userId: user?.id ?? '', accountId })
  const { mutateAsync: deleteGoal } = useDeleteGoal(goalId)

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const now = useMemo(() => new Date(), [])

  if (!data) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { goal, account, saved } = data
  const target = Number(goal.target_amount)
  const remaining = Math.max(0, target - saved)
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0

  const tint = goalTint(goal.goal_type)

  // ── Feasibility ──────────────────────────────────────────────────────────
  const rate = monthlyInflowRate(transactions, accountId, now)
  const projectedIso = projectCompletionDate(saved, target, rate, now)
  const targetDateObj = parseTargetDate(goal.target_date)
  const tracking = isGoalOnTrack(saved, target, goal.target_date, goal.created_at)

  // On track when the projection lands on/before the deadline, or the
  // money-vs-time tracking says so (covers the rate<=0 / already-complete cases).
  const projectedDate = projectedIso ? new Date(projectedIso) : null
  const onTrack =
    saved >= target ||
    (projectedDate !== null && projectedDate <= targetDateObj) ||
    tracking.on_track

  const projectedLabel = monthLabel(projectedDate ?? targetDateObj, locale)
  // Required monthly increase, expressed as a % of the current inflow rate.
  const monthsToDeadline = Math.max(0, monthsBetween(now, targetDateObj))
  const needPerMonth = requiredMonthly(remaining, monthsToDeadline)
  const ratePct = rate > 0 ? Math.max(0, Math.round(((needPerMonth - rate) / rate) * 100)) : 100

  const feasibilityText = onTrack
    ? t('detail.feasibleOnTrack', { date: projectedLabel })
    : t('detail.feasibleBehind', { rate: ratePct, date: monthLabel(targetDateObj, locale) })

  // ── Insights ─────────────────────────────────────────────────────────────
  // Accelerate: finish a couple of months early → required monthly to close
  // the gap in (monthsToDeadline - 2) months.
  const sooner = 2
  const accelMonths = Math.max(1, monthsToDeadline - sooner)
  const accelAmount = requiredMonthly(remaining, accelMonths)

  const streak = consistencyStreak(transactions, accountId, now)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pt-3 md:max-w-2xl">
      <StickyScreenHeader>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={t('detail.title')}
            onClick={() => router.back()}
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-card text-foreground shadow-card transition-colors hover:bg-muted/50"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="truncate text-xl leading-title-4 font-bold text-foreground">{t('detail.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('edit.title')}
            onClick={() => setEditOpen(true)}
            className="flex size-9 items-center justify-center rounded-[10px] bg-card text-foreground shadow-card transition-colors hover:bg-muted/50"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t('deleteDialog.delete')}
            onClick={() => setDeleteOpen(true)}
            className="flex size-9 items-center justify-center rounded-[10px] bg-card text-destructive shadow-card transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </StickyScreenHeader>

      {/* Hero */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', tint.bg)}>
            {createElement(goalIcon(goal.goal_type), { className: cn('size-6', tint.fg), 'aria-hidden': true })}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg leading-title-5 font-bold text-foreground">{goal.name}</h2>
            <p className="text-xs leading-caption text-muted-foreground">{t(`types.${goal.goal_type}`)}</p>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl leading-title-4 font-bold text-foreground">
            {formatCurrency(saved, account.currency)}
          </span>
          <span className="text-sm leading-body-sm text-muted-foreground">
            / {formatCurrency(target, account.currency)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm leading-body-sm">
          <span className="font-medium text-primary">{t('card.tercapai', { pct })}</span>
          <span className="text-muted-foreground">
            {t('detail.remaining', { amount: formatCurrency(remaining, account.currency) })}
          </span>
        </div>
      </section>

      {/* Feasibility */}
      <section
        className={cn(
          'flex items-start gap-3 rounded-2xl border p-4',
          onTrack ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'
        )}
      >
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            onTrack ? 'bg-success/20' : 'bg-warning/20'
          )}
        >
          <TrendingUp className={cn('size-5', onTrack ? 'text-success' : 'text-warning')} />
        </span>
        <p className="mt-1 text-sm leading-body-sm font-medium text-foreground">{feasibilityText}</p>
      </section>

      {/* Insights */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-lg leading-title-5 font-semibold text-foreground">{t('detail.insightsTitle')}</h2>
        <InsightCard
          Icon={TrendingUp}
          tint={goalTint('investment')}
          title={t('insights.accelerateTitle')}
          body={t('insights.accelerateBody', {
            amount: formatCurrency(accelAmount, account.currency),
            months: sooner,
          })}
        />
        <InsightCard
          Icon={Flame}
          tint={goalTint('car_purchase')}
          title={t('insights.streakTitle')}
          body={t('insights.streakBody', { months: streak })}
        />
      </section>

      <EditGoalSheet open={editOpen} onOpenChange={setEditOpen} goal={goal} currency={account.currency} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>{t('deleteDialog.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t('deleteDialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await deleteGoal()
                setDeleteOpen(false)
                router.push('/goals')
              }}
            >
              {t('deleteDialog.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
