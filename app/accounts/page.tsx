'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { PageLayout, MainContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { Card, CardContent } from '@/components/ui/molecules/card'
import { CreditCard, Wallet, TrendingUp, Building2, Loader2, Plus, ChevronRight, Target } from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { formatCurrency } from '@/lib/data-utils'
import { useGoalsSummary } from '@/hooks/useGoalsQuery'
import { getGoalIcon, isGoalOnTrack, getProgressColor } from '@/lib/goals/calculations'
import { AccountNavigation } from '@/components/features/navigation/TopNavigation'
import { Dialog, DialogContent } from '@/components/ui/molecules/dialog'
import { Sheet, SheetContent } from '@/components/ui/organisms/sheet'
import { AccountDetailView } from '@/components/AccountDetailView'
import { useIsMobile } from '@/hooks/use-mobile'

const ACCOUNT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BANK: Building2,
  CREDIT_CARD: CreditCard,
  CASH: Wallet,
  INVESTMENT: TrendingUp,
  OTHER: CreditCard
}

function AccountsPageContent() {
  const t = useTranslations('accounts')
  const { accounts, loading: accountsLoading } = useAccounts()
  const { data: goalsSummary, isLoading: goalsLoading } = useGoalsSummary()
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const loading = accountsLoading || goalsLoading

  // Get goal info for each account
  const getAccountGoal = (accountId: string) => {
    return goalsSummary?.goals.find(g => g.accountId === accountId)
  }

  // Sort accounts: those with goals first, then by balance
  const sortedAccounts = [...accounts].sort((a, b) => {
    const aHasGoal = goalsSummary?.goals.some(g => g.accountId === a.id) ? 1 : 0
    const bHasGoal = goalsSummary?.goals.some(g => g.accountId === b.id) ? 1 : 0
    if (aHasGoal !== bHasGoal) return bHasGoal - aHasGoal
    const aBalance = a.currentBalance ?? a.balance
    const bBalance = b.currentBalance ?? b.balance
    return bBalance - aBalance
  })

  // Filter accounts that can have goals
  const savingsAccounts = sortedAccounts.filter(a => ['BANK', 'INVESTMENT'].includes(a.type))
  const otherAccounts = sortedAccounts.filter(a => !['BANK', 'INVESTMENT'].includes(a.type))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <AccountNavigation />

      <PageLayout>
        <TopContent>
          {/* Summary Cards */}
          {goalsSummary && goalsSummary.goals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">{t('totalSavingsProgress')}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(goalsSummary.totalSavings)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">{t('activeGoals')}</p>
                  <p className="text-2xl font-bold">{goalsSummary.activeGoalsCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">{t('completedGoals')}</p>
                  <p className="text-2xl font-bold text-success">{goalsSummary.completedGoalsCount}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TopContent>

        <ContentWrapper>
          <MainContent className="sm:w-full md:w-full lg:w-full sm:max-w-full">
            {/* Savings & Investment Accounts */}
            {savingsAccounts.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">{t('savingsAndInvestment')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savingsAccounts.map((account) => {
                    const Icon = ACCOUNT_ICONS[account.type] || CreditCard
                    const goal = getAccountGoal(account.id)
                    const tracking = goal
                      ? isGoalOnTrack(goal.currentAmount, goal.targetAmount, goal.targetDate, goal.createdAt)
                      : null

                    return (
                      <div key={account.id} onClick={() => setSelectedAccountId(account.id)} className="cursor-pointer">
                        <Card className="hover:shadow-md transition-shadow h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-muted">
                                  <Icon className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <h4 className="font-semibold">{account.name}</h4>
                                  <p className="text-sm text-muted-foreground capitalize">
                                    {account.type.toLowerCase().replace('_', ' ')}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>

                            <div className="mb-3">
                              <p className="text-2xl font-bold">
                                {formatCurrency(account.currentBalance ?? account.balance, account.currency)}
                              </p>
                            </div>

                            {/* Goal Progress */}
                            {goal ? (
                              <div className="pt-3 border-t">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{getGoalIcon(goal.goalType)}</span>
                                  <span className="text-sm font-medium">{goal.name}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                                  <div
                                    className={`h-full transition-all ${getProgressColor(tracking?.status || 'on_track')}`}
                                    style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{goal.progressPercentage.toFixed(1)}%</span>
                                  <span>{t('target', { amount: formatCurrency(goal.targetAmount, goal.currency) })}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-3 border-t">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Target className="w-4 h-4" />
                                  <span className="text-sm">{t('noGoalSet')}</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Other Accounts */}
            {otherAccounts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('otherAccounts')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {otherAccounts.map((account) => {
                    const Icon = ACCOUNT_ICONS[account.type] || CreditCard

                    return (
                      <div key={account.id} onClick={() => setSelectedAccountId(account.id)} className="cursor-pointer">
                        <Card className="hover:shadow-md transition-shadow h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-muted">
                                  <Icon className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <h4 className="font-semibold">{account.name}</h4>
                                  <p className="text-sm text-muted-foreground capitalize">
                                    {account.type.toLowerCase().replace('_', ' ')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className={`text-lg font-bold ${(account.currentBalance ?? account.balance) >= 0 ? '' : 'text-destructive'}`}>
                                  {formatCurrency(account.currentBalance ?? account.balance, account.currency)}
                                </p>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {accounts.length === 0 && (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('noAccountsTitle')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('noAccountsDescription')}
                </p>
              </div>
            )}
          </MainContent>
        </ContentWrapper>
      </PageLayout>

      {/* Account Detail - Bottom Sheet on mobile, Dialog on desktop */}
      {isMobile ? (
        <Sheet open={!!selectedAccountId} onOpenChange={(open) => !open && setSelectedAccountId(null)}>
          <SheetContent side="bottom" className="h-[95vh] w-full overflow-y-auto rounded-t-2xl px-4 pt-2 pb-6">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            {selectedAccountId && (
              <AccountDetailView
                accountId={selectedAccountId}
                isModal={true}
              />
            )}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!selectedAccountId} onOpenChange={(open) => !open && setSelectedAccountId(null)}>
          <DialogContent className="sm:max-w-[80vw] w-[80vw] h-[80vh] overflow-y-auto">
            {selectedAccountId && (
              <AccountDetailView
                accountId={selectedAccountId}
                isModal={true}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default function AccountsPage() {
  return (
    <AccountsPageContent />
  )
}
