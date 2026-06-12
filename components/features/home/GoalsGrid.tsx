'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Shield, Plane, House, Car, GraduationCap, Heart, TrendingUp, Target, type LucideIcon,
} from 'lucide-react'
import { formatCurrencyCompact } from '@/lib/data-utils'

const GOAL_ICONS: Record<string, LucideIcon> = {
  emergency_fund: Shield,
  vacation: Plane,
  house_down_payment: House,
  car_purchase: Car,
  education: GraduationCap,
  wedding: Heart,
  investment: TrendingUp,
  other: Target,
}

export interface GoalItem {
  id: string
  name: string
  goalType: string
  currentAmount: number
  targetAmount: number
  progressPercentage: number
  currency: string
}

interface GoalsGridProps {
  goals: GoalItem[]
}

/** Financial goals 2-up mini cards (design `lGVxL`). Renders nothing when empty. */
export function GoalsGrid({ goals }: GoalsGridProps) {
  const t = useTranslations('home')
  if (goals.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-md leading-body-lg font-bold text-foreground">{t('goals.title')}</h2>
        <Link href="/accounts" className="text-sm leading-body-sm text-primary">{t('goals.viewAll')}</Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {goals.slice(0, 2).map((g) => {
          const Icon = GOAL_ICONS[g.goalType] ?? Target
          const pct = Math.min(100, Math.round(g.progressPercentage))
          return (
            <div key={g.id} className="flex flex-col gap-2.5 rounded-2xl bg-card p-3.5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-selected">
                  <Icon className="h-4 w-4 text-selected-foreground" aria-hidden="true" />
                </span>
                <span className="rounded-[10px] bg-selected px-2 py-0.5 text-[11px] font-bold text-selected-foreground">
                  {pct}%
                </span>
              </div>
              <p className="truncate text-xs leading-caption font-bold text-foreground">{g.name}</p>
              <p className="text-[11px] leading-none text-muted-foreground">
                {t('goals.of', {
                  current: formatCurrencyCompact(g.currentAmount, g.currency),
                  target: formatCurrencyCompact(g.targetAmount, g.currency),
                })}
              </p>
              <div className="h-1.5 overflow-hidden rounded-sm bg-muted" role="progressbar"
                aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-sm bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
