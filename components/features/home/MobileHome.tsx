'use client'

import { useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions } from '@/contexts/TransactionContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useCategories } from '@/contexts/CategoryContext'
import { useBudgetSnapshot } from '@/hooks/useBudgetSnapshot'
import { useGoalsSummary } from '@/hooks/useGoalsQuery'
import { fetchNetWorthData, getNetWorthChange } from '@/lib/net-worth-utils'
import {
  getGreetingKey, summarizeToday, topExpenses, monthlySpending,
  monthlyNetWorthPoints, splitAccounts, upcomingRecurring,
} from '@/lib/home-utils'
import { OnboardingBanner } from '@/components/features/onboarding'
import { HomeGreetingHeader } from './HomeGreetingHeader'
import { TodayCard } from './TodayCard'
import { NetWorthHeroCard, type HeroMonth } from './NetWorthHeroCard'
import { AccountsCards } from './AccountsCards'
import { BudgetCard } from './BudgetCard'
import { GoalsGrid } from './GoalsGrid'
import { UpcomingStrip } from './UpcomingStrip'
import { BiggestExpensesCard } from './BiggestExpensesCard'

const HERO_MONTHS = 6
const UPCOMING_HORIZON_DAYS = 30
const UPCOMING_MAX = 4
const TOP_EXPENSES = 3

export function MobileHome() {
  const locale = useLocale()
  const { user } = useAuth()
  const { transactions } = useTransactions()
  const { accounts } = useAccounts()
  const { getCategoryName } = useCategories()

  // Stable "now" for the whole mount (react-hooks/purity: no Date.now in render path).
  const [now] = useState(() => new Date())
  const todayISO = useMemo(() => {
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [now])
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { snapshot } = useBudgetSnapshot('monthly', year, month)
  const { data: goalsSummary } = useGoalsSummary()
  const { data: netWorth } = useQuery({
    queryKey: ['home-net-worth', user?.id],
    queryFn: () => fetchNetWorthData(user!.id, '1Y'),
    enabled: !!user?.id,
  })

  const userData = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    avatar: user?.user_metadata?.avatar_url || '/avatars/01.svg',
  }

  const today = useMemo(() => summarizeToday(transactions, todayISO), [transactions, todayISO])

  const heroMonths: HeroMonth[] = useMemo(() => {
    const spend = monthlySpending(transactions, HERO_MONTHS, now)
    const points = monthlyNetWorthPoints(netWorth?.netWorthData ?? [], HERO_MONTHS)
    return spend.map((b) => ({
      label: new Date(b.year, b.month - 1, 1).toLocaleDateString(locale, { month: 'short' }),
      spending: b.total,
      netWorth: points.find((p) => p.year === b.year && p.month === b.month)?.value ?? 0,
    }))
  }, [transactions, netWorth, now, locale])

  const monthIncome = useMemo(
    () => transactions
      .filter((t) => {
        const d = new Date(t.date)
        return t.type === 'INCOME' && d.getFullYear() === year && d.getMonth() + 1 === month
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions, year, month]
  )
  const monthExpenses = useMemo(
    () => monthlySpending(transactions, 1, now)[0]?.total ?? 0,
    [transactions, now]
  )

  const split = useMemo(() => splitAccounts(accounts), [accounts])

  const upcoming = useMemo(
    () => upcomingRecurring(transactions, now, UPCOMING_HORIZON_DAYS, UPCOMING_MAX).map(({ transaction, date }) => ({
      id: transaction.id,
      name: transaction.merchant?.trim() || transaction.description?.trim() || getCategoryName(transaction.category_id),
      categoryName: getCategoryName(transaction.category_id),
      amount: Math.abs(transaction.amount),
      currency: transaction.currency ?? 'IDR',
      dayLabel: date.toLocaleDateString(locale, { weekday: 'short' }),
      dayNumber: date.getDate(),
    })),
    [transactions, now, locale, getCategoryName]
  )

  const biggest = useMemo(
    () => topExpenses(transactions, year, month, TOP_EXPENSES).map((t) => ({
      id: t.id,
      name: t.merchant?.trim() || t.description?.trim() || getCategoryName(t.category_id),
      categoryName: getCategoryName(t.category_id),
      amount: Math.abs(t.amount),
      currency: t.currency ?? 'IDR',
    })),
    [transactions, year, month, getCategoryName]
  )

  const baseCurrency = accounts[0]?.currency ?? 'IDR'
  const todayLabel = now.toLocaleDateString(locale, { weekday: undefined, month: 'short', day: 'numeric' })

  return (
    <div className="flex flex-col gap-5 pt-3 md:hidden">
      <HomeGreetingHeader greetingKey={getGreetingKey(now.getHours())} user={userData} />
      <OnboardingBanner />
      <TodayCard dateLabel={todayLabel} spent={today.spent} count={today.count} currency={baseCurrency} />
      <NetWorthHeroCard
        netWorth={netWorth?.currentNetWorth ?? split.assetsTotal - split.liabilitiesTotal}
        changePercentage={getNetWorthChange(netWorth?.netWorthData ?? []).percentage}
        currency={baseCurrency}
        months={heroMonths}
        income={monthIncome}
        expenses={monthExpenses}
      />
      <AccountsCards
        currency={baseCurrency}
        assets={split.assets}
        liabilities={split.liabilities}
        assetsTotal={split.assetsTotal}
        liabilitiesTotal={split.liabilitiesTotal}
      />
      <BudgetCard
        monthLabel={`${new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long' })} ${year}`}
        spent={snapshot?.total_spent ?? 0}
        total={snapshot?.total_amount ?? 0}
        currency={snapshot?.currency ?? baseCurrency}
      />
      <GoalsGrid goals={goalsSummary?.goals ?? []} />
      <UpcomingStrip items={upcoming} />
      <BiggestExpensesCard rows={biggest} />
    </div>
  )
}
